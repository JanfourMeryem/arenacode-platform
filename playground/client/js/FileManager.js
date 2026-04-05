/* ═══════════════════════════════════════════════════════════
   AlgoArena — FileManager (virtual file tree + tabs)
   ═══════════════════════════════════════════════════════════ */

import { fileIcon, DEFAULT_ENTRY, langColorFromFilename } from './utils.js';

export class FileManager {
  constructor(treeContainer, tabBar) {
    this.treeEl = treeContainer;
    this.tabBar = tabBar;

    this.files = new Map();        // name → content
    this.entryFile = null;
    this.activeFile = null;
    this.openTabs = [];            // ordered list of open tab names

    /* Callbacks set by main.js */
    this.onFileSelect = null;      // (name)
    this.onFileClose = null;       // (name)
    this.onFilesChanged = null;    // ()
    this.onContextMenu = null;     // (event, fileName)
    this.onFileRename = null;      // (oldName, newName)

    this._renaming = null;         // fileName being renamed
  }

  /* ─── Bulk operations ─── */

  setFiles(fileList, entryFile, openTabs, activeFile) {
    this.files.clear();
    for (const f of fileList) {
      this.files.set(f.name, f.content || '');
    }

    this.entryFile = entryFile || (fileList.length ? fileList[0].name : null);
    this.openTabs = openTabs || (fileList.length ? [fileList[0].name] : []);
    this.activeFile = activeFile || (this.openTabs.length ? this.openTabs[0] : null);

    // Prune tabs that no longer exist
    this.openTabs = this.openTabs.filter((n) => this.files.has(n));
    if (this.activeFile && !this.files.has(this.activeFile)) {
      this.activeFile = this.openTabs[0] || null;
    }

    this._render();
  }

  /* ─── Single file operations ─── */

  addFile(name, content = '') {
    if (this.files.has(name)) return;
    this.files.set(name, content);
    if (!this.entryFile) this.entryFile = name;
    if (!this.openTabs.includes(name)) this.openTabs.push(name);
    this._render();
    this.onFilesChanged?.();
  }

  deleteFile(name) {
    if (!this.files.has(name)) return;
    this.files.delete(name);
    this.openTabs = this.openTabs.filter((n) => n !== name);

    if (this.entryFile === name) {
      this.entryFile = this.files.size ? this.files.keys().next().value : null;
    }

    if (this.activeFile === name) {
      this.activeFile = this.openTabs.length ? this.openTabs[this.openTabs.length - 1] : null;
      if (this.activeFile) this.onFileSelect?.(this.activeFile);
    }

    this.onFileClose?.(name);
    this._render();
    this.onFilesChanged?.();
  }

  duplicateFile(name) {
    const content = this.files.get(name) || '';
    const parts = name.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop() : '';
    const base = parts.join('.');
    let newName = `${base}-copy${ext}`;
    let i = 2;
    while (this.files.has(newName)) {
      newName = `${base}-copy${i}${ext}`;
      i++;
    }
    this.addFile(newName, content);
    this.selectFile(newName);
  }

  renameFile(oldName, newName) {
    if (!this.files.has(oldName) || this.files.has(newName)) return;
    const content = this.files.get(oldName);
    this.files.delete(oldName);
    this.files.set(newName, content);

    const idx = this.openTabs.indexOf(oldName);
    if (idx >= 0) this.openTabs[idx] = newName;
    if (this.entryFile === oldName) this.entryFile = newName;
    if (this.activeFile === oldName) this.activeFile = newName;

    this._render();
    this.onFileRename?.(oldName, newName);
    this.onFilesChanged?.();
    return newName;
  }

  startRename(name) {
    this._renaming = name;
    this._render();
    setTimeout(() => {
      const input = this.treeEl.querySelector('.inline-rename');
      if (input) {
        input.focus();
        const dot = name.lastIndexOf('.');
        input.setSelectionRange(0, dot >= 0 ? dot : name.length);
      }
    }, 0);
  }

  setEntryFile(name) {
    if (this.files.has(name)) {
      this.entryFile = name;
      this._render();
      this.onFilesChanged?.();
    }
  }

  selectFile(name) {
    if (!this.files.has(name)) return;
    if (!this.openTabs.includes(name)) this.openTabs.push(name);
    this.activeFile = name;
    this.onFileSelect?.(name);
    this._render();
  }

  updateContent(name, content) {
    if (this.files.has(name)) {
      this.files.set(name, content);
    }
  }

  /* ─── Getters ─── */

  getContent(name) { return this.files.get(name) || ''; }
  getActiveFile() { return this.activeFile; }
  getEntryFile() { return this.entryFile; }
  getOpenTabs() { return [...this.openTabs]; }

  getAllFiles() {
    const result = [];
    for (const [name, content] of this.files) {
      result.push({ name, content });
    }
    return result;
  }

  generateNewFileName(language) {
    const ext = {
      python: '.py',
      java: '.java',
      c: '.c',
      cpp: '.cpp',
      csharp: '.cs',
      php: '.php',
      javascript: '.js',
      typescript: '.ts',
      go: '.go',
      ruby: '.rb',
    }[language] || '.txt';
    let base = 'untitled';
    let i = 1;
    let name = `${base}${ext}`;
    while (this.files.has(name)) {
      name = `${base}${i}${ext}`;
      i++;
    }
    return name;
  }

  /* ─── Rendering ─── */

  _render() {
    this._renderTree();
    this._renderTabs();
  }

  _renderTree() {
    const el = this.treeEl;
    el.innerHTML = '';

    if (this.files.size === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="icon icon-folder icon-xl"></i></div><div class="empty-state-text">No files yet</div></div>';
      return;
    }

    for (const [name] of this.files) {
      if (this._renaming === name) {
        // Inline rename input
        const wrap = document.createElement('div');
        wrap.className = 'file-item';
        wrap.innerHTML = `<span class="file-icon">${fileIcon(name)}</span>`;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-rename';
        input.value = name;
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { this._commitRename(name, input.value.trim()); }
          if (e.key === 'Escape') { this._renaming = null; this._render(); }
        });
        input.addEventListener('blur', () => {
          if (this._renaming) { this._commitRename(name, input.value.trim()); }
        });
        wrap.appendChild(input);
        el.appendChild(wrap);
        continue;
      }

      const div = document.createElement('div');
      div.className = `file-item${this.activeFile === name ? ' active' : ''}`;
      const treeColor = langColorFromFilename(name);
      if (treeColor) div.style.setProperty('--file-lang-color', treeColor);
      div.innerHTML = `
        ${treeColor ? '<span class="file-lang-bar"></span>' : ''}
        <span class="file-icon">${fileIcon(name)}</span>
        <span class="file-name">${name}</span>
        ${this.entryFile === name ? '<span class="file-entry-star" title="Entry file"><i class="icon icon-star icon-xs"></i></span>' : ''}
        <span class="file-actions">
          <button class="file-action-btn" data-action="rename" title="Rename"><i class="icon icon-edit icon-xs"></i></button>
          <button class="file-action-btn" data-action="delete" title="Delete"><i class="icon icon-x icon-xs"></i></button>
        </span>
      `;

      div.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        this.selectFile(name);
      });

      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.onContextMenu?.(e, name);
      });

      div.querySelector('[data-action="rename"]')?.addEventListener('click', () => this.startRename(name));
      div.querySelector('[data-action="delete"]')?.addEventListener('click', () => this.deleteFile(name));

      el.appendChild(div);
    }
  }

  _renderTabs() {
    const bar = this.tabBar;
    bar.innerHTML = '';

    for (const name of this.openTabs) {
      const tab = document.createElement('div');
      tab.className = `tab${this.activeFile === name ? ' active' : ''}`;
      tab.draggable = true;
      tab.dataset.tabName = name;
      const langColor = langColorFromFilename(name);
      if (langColor) tab.style.setProperty('--tab-lang-color', langColor);
      tab.innerHTML = `
        ${langColor ? '<span class="tab-lang-accent"></span>' : ''}
        ${this.entryFile === name ? '<span class="tab-entry-badge" title="Entry file"></span>' : ''}
        <span class="tab-icon">${fileIcon(name)}</span>
        <span class="tab-name">${name}</span>
        <span class="tab-close" title="Close"><i class="icon icon-x icon-xs"></i></span>
      `;

      tab.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close')) return;
        this.selectFile(name);
      });

      tab.querySelector('.tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeTab(name);
      });

      /* ─── Drag & Drop for tab reordering ─── */
      tab.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', name);
        tab.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      tab.addEventListener('dragend', () => {
        tab.classList.remove('dragging');
        bar.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
      });

      tab.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        tab.classList.add('drag-over');
      });

      tab.addEventListener('dragleave', () => {
        tab.classList.remove('drag-over');
      });

      tab.addEventListener('drop', (e) => {
        e.preventDefault();
        tab.classList.remove('drag-over');
        const draggedName = e.dataTransfer.getData('text/plain');
        if (draggedName === name) return;
        const fromIdx = this.openTabs.indexOf(draggedName);
        const toIdx = this.openTabs.indexOf(name);
        if (fromIdx < 0 || toIdx < 0) return;
        this.openTabs.splice(fromIdx, 1);
        this.openTabs.splice(toIdx, 0, draggedName);
        this._renderTabs();
        this.onFilesChanged?.();
      });

      bar.appendChild(tab);
    }
  }

  _closeTab(name) {
    this.openTabs = this.openTabs.filter((n) => n !== name);
    if (this.activeFile === name) {
      this.activeFile = this.openTabs.length ? this.openTabs[this.openTabs.length - 1] : null;
      if (this.activeFile) this.onFileSelect?.(this.activeFile);
    }
    this.onFileClose?.(name);
    this._render();
  }

  _commitRename(oldName, newName) {
    this._renaming = null;
    if (!newName || newName === oldName) {
      this._render();
      return;
    }
    if (this.files.has(newName)) {
      this._render();
      return;
    }
    this.renameFile(oldName, newName);
  }
}
