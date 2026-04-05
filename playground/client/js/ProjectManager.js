/* ═══════════════════════════════════════════════════════════
   AlgoArena — ProjectManager (localStorage + sharing)
   ═══════════════════════════════════════════════════════════ */

import { uid } from './utils.js';
import { createProjectStorageKeys } from './storageNamespace.js';

const MAX_URL_LENGTH = 6000;

export class ProjectManager {
  constructor(runtimeContext = null) {
    this.storage = createProjectStorageKeys(runtimeContext || undefined);
    this.projects = this._loadAll();
    this.currentId = this._loadCurrentId();
  }

  /* ─── Load / Save ─── */

  _readStorage(namespacedKey, legacyKey = null) {
    const scopedValue = localStorage.getItem(namespacedKey);
    if (scopedValue !== null) return scopedValue;

    if (!this.storage.context.allowLegacyFallback || !legacyKey) return null;

    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue === null) return null;

    // One-time migration to namespaced keys in normal playground mode.
    try {
      localStorage.setItem(namespacedKey, legacyValue);
    } catch {}

    return legacyValue;
  }

  _loadCurrentId() {
    const currentId = this._readStorage(this.storage.current, this.storage.legacyCurrent);
    return currentId || null;
  }

  _loadAll() {
    try {
      const raw = this._readStorage(this.storage.projects, this.storage.legacyProjects);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  _persist() {
    try {
      localStorage.setItem(this.storage.projects, JSON.stringify(this.projects));
    } catch (e) {
      console.warn('Failed to save projects:', e);
      if (e.name === 'QuotaExceededError') {
        throw new Error('Storage is full. Delete unused projects to free space.');
      }
    }
  }

  /* ─── Current project ─── */

  saveCurrent(projectData) {
    if (!this.currentId) {
      this.currentId = uid();
      localStorage.setItem(this.storage.current, this.currentId);
    }
    this.projects[this.currentId] = {
      ...projectData,
      id: this.currentId,
      updatedAt: Date.now(),
    };
    this._persist();
  }

  loadCurrent() {
    if (!this.currentId) return null;
    return this.projects[this.currentId] || null;
  }

  /* ─── Create ─── */

  createNew(projectData) {
    const id = uid();
    this.currentId = id;
    localStorage.setItem(this.storage.current, id);
    this.projects[id] = {
      ...projectData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this._persist();
    return id;
  }

  /* ─── Duplicate ─── */

  duplicate(id) {
    const src = this.projects[id];
    if (!src) return null;
    const newId = uid();
    const dup = {
      ...JSON.parse(JSON.stringify(src)),
      id: newId,
      name: `${src.name || 'Untitled'} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.projects[newId] = dup;
    this._persist();
    return dup;
  }

  /* ─── Switch ─── */

  switchTo(id) {
    if (!this.projects[id]) return null;
    this.currentId = id;
    localStorage.setItem(this.storage.current, id);
    return this.projects[id];
  }

  /* ─── List ─── */

  list() {
    return Object.values(this.projects)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  /* ─── Delete ─── */

  delete(id) {
    delete this.projects[id];
    if (this.currentId === id) {
      const remaining = this.list();
      this.currentId = remaining.length ? remaining[0].id : null;
      localStorage.setItem(this.storage.current, this.currentId || '');
    }
    this._persist();
  }

  /* ─── Rename ─── */

  rename(id, newName) {
    if (this.projects[id]) {
      this.projects[id].name = newName;
      this.projects[id].updatedAt = Date.now();
      this._persist();
    }
  }

  /* ─── Export JSON ─── */

  exportJSON(id) {
    const project = this.projects[id];
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    this._downloadBlob(blob, `${this._safeName(project)}.json`);
  }

  /* ─── Export ZIP ─── */

  async exportZIP(id) {
    const project = this.projects[id];
    if (!project) return;

    const encoder = new TextEncoder();
    const zipParts = [];
    const centralDir = [];
    let offset = 0;

    const addEntry = (name, content) => {
      const nb = encoder.encode(name);
      const cb = encoder.encode(content);
      const crc = this._crc32(cb);

      // Local file header (30 + name)
      const lh = new Uint8Array(30 + nb.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(8, 0, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, cb.length, true);
      lv.setUint32(22, cb.length, true);
      lv.setUint16(26, nb.length, true);
      lh.set(nb, 30);

      // Central directory entry (46 + name)
      const cd = new Uint8Array(46 + nb.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, cb.length, true);
      cv.setUint32(24, cb.length, true);
      cv.setUint16(28, nb.length, true);
      cv.setUint32(42, offset, true);
      cd.set(nb, 46);

      centralDir.push(cd);
      zipParts.push(lh, cb);
      offset += lh.length + cb.length;
    };

    for (const f of (project.files || [])) {
      addEntry(f.name, f.content || '');
    }

    // Metadata file
    addEntry('.algoarena', JSON.stringify({
      name: project.name,
      language: project.language,
      entryFile: project.entryFile,
    }, null, 2));

    // End of central directory
    const cdSize = centralDir.reduce((s, e) => s + e.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, centralDir.length, true);
    ev.setUint16(10, centralDir.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);

    const blob = new Blob([...zipParts, ...centralDir, eocd], { type: 'application/zip' });
    this._downloadBlob(blob, `${this._safeName(project)}.zip`);
  }

  /* ─── Share via URL ─── */

  generateShareURL(id) {
    const project = this.projects[id];
    if (!project) return null;

    const shareData = {
      n: project.name,
      l: project.language,
      e: project.entryFile,
      f: (project.files || []).map(f => ({ n: f.name, c: f.content })),
    };

    const json = JSON.stringify(shareData);
    const encoded = this._toBase64URL(json);
    const url = `${location.origin}${location.pathname}?project=${encoded}`;

    return url.length <= MAX_URL_LENGTH ? url : null;
  }

  /**
   * Parse a shared project from the current URL query string.
   */
  static parseShareURL() {
    const params = new URLSearchParams(location.search);
    const encoded = params.get('project');
    if (!encoded) return null;

    try {
      const json = ProjectManager._fromBase64URL(encoded);
      const d = JSON.parse(json);
      return {
        name: d.n || 'Shared Project',
        language: d.l || 'python',
        entryFile: d.e || null,
        files: (d.f || []).map(f => ({ name: f.n, content: f.c || '' })),
      };
    } catch { return null; }
  }

  /* ─── Import JSON ─── */

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.files || !Array.isArray(data.files)) {
            throw new Error('Invalid project file: missing files array');
          }
          const id = uid();
          data.id = id;
          data.updatedAt = Date.now();
          data.name = data.name || file.name.replace('.json', '');
          this.projects[id] = data;
          this._persist();
          resolve(data);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /* ─── Import ZIP ─── */

  importZIP(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buf = new Uint8Array(e.target.result);
          const entries = this._parseZIP(buf);
          if (!entries.length) throw new Error('No files found in ZIP');

          let meta = {};
          const me = entries.find(x => x.name === '.algoarena');
          if (me) try { meta = JSON.parse(me.content); } catch {}

          const files = entries
            .filter(x => x.name !== '.algoarena' && !x.name.startsWith('__MACOSX'))
            .map(x => ({ name: x.name, content: x.content }));

          if (!files.length) throw new Error('No source files found in ZIP');

          const id = uid();
          const project = {
            id,
            name: meta.name || file.name.replace(/\.zip$/i, ''),
            language: meta.language || this._guessLang(files),
            entryFile: meta.entryFile || files[0].name,
            files,
            openTabs: [files[0].name],
            activeFile: files[0].name,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          this.projects[id] = project;
          this._persist();
          resolve(project);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read ZIP'));
      reader.readAsArrayBuffer(file);
    });
  }

  /* ─── Stats ─── */

  get count() { return Object.keys(this.projects).length; }

  get storageUsed() {
    try {
      const raw = localStorage.getItem(this.storage.projects) || '';
      return new Blob([raw]).size;
    } catch { return 0; }
  }

  getProjectSize(id) {
    const p = this.projects[id];
    if (!p) return 0;
    return new Blob([JSON.stringify(p)]).size;
  }

  /* ─── Backwards-compat aliases ─── */
  exportProject(id) { this.exportJSON(id); }
  importProject(file) {
    return file.name?.endsWith('.zip') ? this.importZIP(file) : this.importJSON(file);
  }

  /* ─── Private helpers ─── */

  _downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  _safeName(project) {
    return (project.name || 'project').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  _toBase64URL(str) {
    const bytes = new TextEncoder().encode(str);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  static _fromBase64URL(encoded) {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  _crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  _parseZIP(buffer) {
    const entries = [];
    const view = new DataView(buffer.buffer || buffer);
    let pos = 0;
    while (pos < buffer.length - 4) {
      if (view.getUint32(pos, true) !== 0x04034b50) break;
      const compressedSize = view.getUint32(pos + 18, true);
      const nameLen = view.getUint16(pos + 26, true);
      const extraLen = view.getUint16(pos + 28, true);
      const name = new TextDecoder().decode(buffer.slice(pos + 30, pos + 30 + nameLen));
      const dataStart = pos + 30 + nameLen + extraLen;
      const content = new TextDecoder().decode(buffer.slice(dataStart, dataStart + compressedSize));
      if (name && !name.endsWith('/')) entries.push({ name, content });
      pos = dataStart + compressedSize;
    }
    return entries;
  }

  _guessLang(files) {
    const map = { py: 'python', java: 'java', c: 'c', cpp: 'cpp', cc: 'cpp', cs: 'csharp', php: 'php', js: 'javascript', ts: 'typescript', go: 'go', rb: 'ruby' };
    for (const f of files) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (map[ext]) return map[ext];
    }
    return 'python';
  }
}
