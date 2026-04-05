/* ═══════════════════════════════════════════════════════════
   AlgoArena — UIController
   Theme, Zen mode, resize, shortcuts, modals, toasts, menus
   ═══════════════════════════════════════════════════════════ */

import { IS_MAC, MOD, formatDate, escapeHtml, LANG_COLORS } from './utils.js';
import { createThemeStorageKeys } from './storageNamespace.js';

const LEGACY_EDITOR_THEME_KEY = 'algoarena_theme';

function normalizeGlobalTheme(value) {
  if (typeof value !== 'string') return null;
  const theme = value.trim().toLowerCase();
  if (theme === 'light' || theme === 'daylight') return 'light';
  if (theme === 'dark' || theme === 'midnight') return 'dark';
  return null;
}

function isLightEditorTheme(themeName) {
  return themeName === 'daylight' || themeName === 'solarized-light';
}

function mapGlobalThemeToEditorTheme(globalTheme) {
  return globalTheme === 'light' ? 'daylight' : 'midnight';
}

function resolveGlobalThemePreference(globalThemeKeys) {
  const storedGlobalTheme = normalizeGlobalTheme(localStorage.getItem(globalThemeKeys.contextKey));
  if (storedGlobalTheme) return storedGlobalTheme;

  // Keep backward compatibility only for normal playground.
  // Challenge contexts must stay isolated from shared/global legacy theme keys.
  if (globalThemeKeys.context.scope === 'playground') {
    const legacyGlobalTheme = normalizeGlobalTheme(localStorage.getItem(globalThemeKeys.legacyGlobal));
    if (legacyGlobalTheme) {
      localStorage.setItem(globalThemeKeys.contextKey, legacyGlobalTheme);
      return legacyGlobalTheme;
    }
  }

  for (const legacyKey of globalThemeKeys.legacyKeys) {
    const legacyTheme = normalizeGlobalTheme(localStorage.getItem(legacyKey));
    if (legacyTheme) {
      localStorage.setItem(globalThemeKeys.contextKey, legacyTheme);
      return legacyTheme;
    }
  }

  return null;
}

/* ─── Theme metadata (for the picker) ─── */
const THEMES = [
  { id: 'midnight',        label: 'Midnight',         dark: true,  colors: ['#0d1117','#161b22','#58a6ff'] },
  { id: 'daylight',        label: 'Daylight',         dark: false, colors: ['#ffffff','#f6f8fa','#0969da'] },
  { id: 'monokai',         label: 'Monokai',          dark: true,  colors: ['#272822','#1e1f1c','#f92672'] },
  { id: 'dracula',         label: 'Dracula',          dark: true,  colors: ['#282a36','#21222c','#bd93f9'] },
  { id: 'nord',            label: 'Nord',             dark: true,  colors: ['#2e3440','#3b4252','#88c0d0'] },
  { id: 'solarized-dark',  label: 'Solarized Dark',   dark: true,  colors: ['#002b36','#073642','#268bd2'] },
  { id: 'solarized-light', label: 'Solarized Light',  dark: false, colors: ['#fdf6e3','#eee8d5','#268bd2'] },
  { id: 'synthwave',       label: 'Synthwave \'84',   dark: true,  colors: ['#262335','#241b2f','#ff7edb'] },
  { id: 'github-dark',     label: 'GitHub Dark',      dark: true,  colors: ['#0d1117','#161b22','#f78166'] },
  { id: 'high-contrast',   label: 'High Contrast',    dark: true,  colors: ['#000000','#1a1a1a','#00ff00'] },
];

export class UIController {
  constructor(runtimeContext) {
    this.globalThemeKeys = createThemeStorageKeys(runtimeContext);
    this.editorThemeKey = `${LEGACY_EDITOR_THEME_KEY}:${this.globalThemeKeys.context.scope}`;
    const allowLegacyEditorTheme = this.globalThemeKeys.context.scope === 'playground';

    const globalTheme = resolveGlobalThemePreference(this.globalThemeKeys);
    const storedEditorTheme = localStorage.getItem(this.editorThemeKey)
      || (allowLegacyEditorTheme ? localStorage.getItem(LEGACY_EDITOR_THEME_KEY) : null);
    const storedThemeMatchesGlobal = storedEditorTheme
      ? (globalTheme === 'light'
        ? isLightEditorTheme(storedEditorTheme)
        : !isLightEditorTheme(storedEditorTheme))
      : false;

    this.theme = globalTheme
      ? (storedThemeMatchesGlobal ? storedEditorTheme : mapGlobalThemeToEditorTheme(globalTheme))
      : (storedEditorTheme || 'midnight');
    this.zenMode = false;
    this.sidebarCollapsed = false;
    this.panelCollapsed = false;
    this.panelMaximized = false;

    /* Callbacks set by main.js */
    this.onLayoutChange = null;
    this.onThemeChange = null;
  }

  /* ─── Theme ─── */

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    this.syncGlobalTheme(this.theme);
  }

  setTheme(name) {
    this.theme = name;
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem(this.editorThemeKey, name);
    this.syncGlobalTheme(name);
    this.onThemeChange?.(name);
  }

  syncGlobalTheme(editorTheme) {
    const globalTheme = isLightEditorTheme(editorTheme) ? 'light' : 'dark';
    localStorage.setItem(this.globalThemeKeys.contextKey, globalTheme);
  }

  /* ─── Layout toggles ─── */

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    document.body.classList.toggle('sidebar-collapsed', this.sidebarCollapsed);
    // Update activity bar explorer button state
    const explorerBtn = document.querySelector('.activity-btn[data-panel="explorer"]');
    if (explorerBtn) explorerBtn.classList.toggle('active', !this.sidebarCollapsed);
    setTimeout(() => this.onLayoutChange?.(), 260);
  }

  togglePanel() {
    this.panelCollapsed = !this.panelCollapsed;
    if (this.panelMaximized && this.panelCollapsed) {
      this.panelMaximized = false;
      document.body.classList.remove('panel-maximized');
    }
    document.body.classList.toggle('panel-collapsed', this.panelCollapsed);
    setTimeout(() => this.onLayoutChange?.(), 260);
  }

  togglePanelMaximize() {
    this.panelMaximized = !this.panelMaximized;
    if (this.panelMaximized && this.panelCollapsed) {
      this.panelCollapsed = false;
      document.body.classList.remove('panel-collapsed');
    }
    document.body.classList.toggle('panel-maximized', this.panelMaximized);
    setTimeout(() => this.onLayoutChange?.(), 260);
  }

  toggleTerminal() {
    this.togglePanel();
  }

  toggleZenMode() {
    this.zenMode = !this.zenMode;
    document.body.classList.toggle('zen-mode', this.zenMode);
    setTimeout(() => this.onLayoutChange?.(), 260);
  }

  /* ─── Keyboard Shortcuts ─── */

  initKeyboardShortcuts(actions) {
    document.addEventListener('keydown', (e) => {
      const mod = IS_MAC ? e.metaKey : e.ctrlKey;

      // Escape → exit zen mode
      if (e.key === 'Escape' && this.zenMode) {
        this.toggleZenMode();
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+P → Command Palette
      if (mod && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        actions.commandPalette?.();
        return;
      }

      // Ctrl+/ → Shortcuts overlay
      if (mod && e.key === '/') {
        e.preventDefault();
        actions.shortcutsOverlay?.();
        return;
      }

      // Ctrl+Enter → Run
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        actions.run?.();
        return;
      }

      // Ctrl+S → Save
      if (mod && e.key === 's') {
        e.preventDefault();
        actions.save?.();
        return;
      }

      // Ctrl+N → New file
      if (mod && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        actions.newFile?.();
        return;
      }

      // Ctrl+B → Toggle sidebar
      if (mod && e.key === 'b') {
        e.preventDefault();
        actions.toggleSidebar?.();
        return;
      }

      // Ctrl+` → Toggle terminal
      if (mod && e.key === '`') {
        e.preventDefault();
        actions.toggleTerminal?.();
        return;
      }

      // Ctrl+Shift+Z → Zen mode
      if (mod && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        actions.zenMode?.();
        return;
      }
    });
  }

  /* ─── Terminal Resize ─── */

  initTerminalResize(handle, terminalArea, onResize) {
    let startY, startH;
    const onMove = (e) => {
      const delta = startY - e.clientY;
      const newH = Math.max(80, Math.min(window.innerHeight - 200, startH + delta));
      terminalArea.style.height = newH + 'px';
      onResize?.();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      handle.classList.remove('active');
    };
    handle.addEventListener('mousedown', (e) => {
      startY = e.clientY;
      startH = terminalArea.offsetHeight;
      handle.classList.add('active');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    });
  }

  /* ─── Toast Notifications ─── */

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const icons = {
      success: '<i class="icon icon-check-circle icon-sm"></i>',
      error: '<i class="icon icon-alert-circle icon-sm"></i>',
      warning: '<i class="icon icon-alert-triangle icon-sm"></i>',
      info: '<i class="icon icon-info icon-sm"></i>',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ─── Context Menu ─── */

  showContextMenu(event, items) {
    this._closeContextMenu();
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';
    menu.classList.remove('hidden');

    for (const item of items) {
      if (item.type === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'context-menu-sep';
        menu.appendChild(sep);
        continue;
      }
      const btn = document.createElement('button');
      btn.className = `context-menu-item${item.className ? ' ' + item.className : ''}`;
      btn.innerHTML = `<span class="context-menu-icon">${item.icon || ''}</span> ${escapeHtml(item.label)}`;
      btn.addEventListener('click', () => {
        this._closeContextMenu();
        item.action?.();
      });
      menu.appendChild(btn);
    }

    // Position
    const x = Math.min(event.clientX, window.innerWidth - 180);
    const y = Math.min(event.clientY, window.innerHeight - items.length * 32 - 20);
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', this._closeContextMenu, { once: true });
      document.addEventListener('contextmenu', this._closeContextMenu, { once: true });
    }, 0);
  }

  _closeContextMenu = () => {
    const menu = document.getElementById('context-menu');
    if (menu) menu.classList.add('hidden');
  };

  /* ─── Modal System ─── */

  _showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.remove('hidden');

    // Close on backdrop click
    overlay.onclick = (e) => {
      if (e.target === overlay) this._closeModal();
    };

    // Close on Escape
    const handler = (e) => {
      if (e.key === 'Escape') { this._closeModal(); document.removeEventListener('keydown', handler); }
    };
    document.addEventListener('keydown', handler);

    return content;
  }

  _closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  /* ─── Theme Picker Modal ─── */

  showThemePicker() {
    const cards = THEMES.map((t) => `
      <div class="theme-card${this.theme === t.id ? ' active' : ''}" data-theme-id="${t.id}">
        <div class="theme-preview">
          ${t.colors.map(c => `<div class="theme-swatch" style="background:${c}"></div>`).join('')}
        </div>
        <div class="theme-label">${t.label}</div>
      </div>
    `).join('');

    const el = this._showModal(`
      <div class="modal-header">
        <span class="modal-title"><i class="icon icon-palette icon-sm"></i> Choose Theme</span>
        <button class="btn-icon modal-close-btn" title="Close"><i class="icon icon-x icon-sm"></i></button>
      </div>
      <div class="modal-body">
        <div class="theme-grid">${cards}</div>
      </div>
    `);

    el.querySelector('.modal-close-btn').addEventListener('click', () => this._closeModal());

    el.querySelectorAll('.theme-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.themeId;
        this.setTheme(id);
        // Update active state
        el.querySelectorAll('.theme-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
      });
    });
  }

  /* ─── Settings Modal ─── */

  showSettingsModal(editor) {
    const s = editor.getSettings();

    const el = this._showModal(`
      <div class="modal-header">
        <span class="modal-title"><i class="icon icon-settings icon-sm"></i> Editor Settings</span>
        <button class="btn-icon modal-close-btn" title="Close"><i class="icon icon-x icon-sm"></i></button>
      </div>
      <div class="modal-body">
        <div class="settings-group">
          <div class="settings-group-title">Appearance</div>
          <div class="settings-row">
            <span class="settings-label">Font Size</span>
            <div class="settings-value">
              <button class="btn-icon" data-action="font-down"><i class="icon icon-minus icon-sm"></i></button>
              <span id="font-size-val" class="mono" style="min-width:28px;text-align:center">${s.fontSize}</span>
              <button class="btn-icon" data-action="font-up"><i class="icon icon-plus icon-sm"></i></button>
            </div>
          </div>
          <div class="settings-row">
            <span class="settings-label">Minimap</span>
            <label class="toggle">
              <input type="checkbox" id="setting-minimap" ${s.minimap ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Editor</div>
          <div class="settings-row">
            <span class="settings-label">Word Wrap</span>
            <label class="toggle">
              <input type="checkbox" id="setting-wordwrap" ${s.wordWrap === 'on' ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span class="settings-label">Line Numbers</span>
            <label class="toggle">
              <input type="checkbox" id="setting-linenums" ${s.lineNumbers === 'on' ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span class="settings-label">Tab Size</span>
            <select id="setting-tabsize" class="select-sm">
              <option value="2" ${s.tabSize === 2 ? 'selected' : ''}>2</option>
              <option value="4" ${s.tabSize === 4 ? 'selected' : ''}>4</option>
              <option value="8" ${s.tabSize === 8 ? 'selected' : ''}>8</option>
            </select>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Shortcuts</div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:2">
            <kbd>${MOD}</kbd>+<kbd>Enter</kbd> Run / Stop<br>
            <kbd>${MOD}</kbd>+<kbd>S</kbd> Save<br>
            <kbd>${MOD}</kbd>+<kbd>B</kbd> Toggle Sidebar<br>
            <kbd>${MOD}</kbd>+<kbd>\`</kbd> Toggle Terminal<br>
            <kbd>${MOD}</kbd>+<kbd>N</kbd> New File<br>
            <kbd>${MOD}</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> Zen Mode<br>
            <kbd>Esc</kbd> Exit Zen Mode
          </div>
        </div>
      </div>
    `);

    let fontSize = s.fontSize;

    el.querySelector('.modal-close-btn').addEventListener('click', () => this._closeModal());

    el.querySelector('[data-action="font-down"]').addEventListener('click', () => {
      fontSize = Math.max(10, fontSize - 1);
      el.querySelector('#font-size-val').textContent = fontSize;
      editor.setFontSize(fontSize);
    });
    el.querySelector('[data-action="font-up"]').addEventListener('click', () => {
      fontSize = Math.min(32, fontSize + 1);
      el.querySelector('#font-size-val').textContent = fontSize;
      editor.setFontSize(fontSize);
    });
    el.querySelector('#setting-minimap').addEventListener('change', (e) => {
      editor.setMinimap(e.target.checked);
    });
    el.querySelector('#setting-wordwrap').addEventListener('change', (e) => {
      editor.setWordWrap(e.target.checked ? 'on' : 'off');
    });
    el.querySelector('#setting-linenums').addEventListener('change', (e) => {
      editor.setLineNumbers(e.target.checked ? 'on' : 'off');
    });
    el.querySelector('#setting-tabsize').addEventListener('change', (e) => {
      editor.setTabSize(parseInt(e.target.value));
    });
  }

  /* ─── Helper: format bytes ─── */

  _formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /* ─── Projects Modal ─── */

  showProjectsModal(projects, buildCurrent, loadProject, newProject, templates) {
    const langNames = { python: 'Python', java: 'Java', c: 'C', cpp: 'C++', csharp: 'C#', php: 'PHP', javascript: 'JavaScript', typescript: 'TypeScript', go: 'Go', ruby: 'Ruby' };
    const langIcons = { python: '🐍', java: '☕', c: '⚙️', cpp: '⚙️', csharp: '🟣', php: '🐘', javascript: '🟨', typescript: '🔵', go: '🐹', ruby: '💎' };

    /* ─── State ─── */
    let confirmingDelete = null; // id being confirmed
    let searchTerm = '';

    /* ─── Render helpers ─── */
    const renderList = () => {
      const list = projects.list();
      const filtered = searchTerm
        ? list.filter(p => {
            const hay = `${p.name} ${p.language} ${langNames[p.language] || ''}`.toLowerCase();
            return hay.includes(searchTerm.toLowerCase());
          })
        : list;

      const storageUsed = projects.storageUsed;
      const storageBar = `
        <div class="pm-storage-bar">
          <div class="pm-storage-label">
            <span>Storage: ${this._formatBytes(storageUsed)}</span>
            <span>${projects.count} project${projects.count === 1 ? '' : 's'}</span>
          </div>
          <div class="pm-storage-track">
            <div class="pm-storage-fill" style="width: ${Math.min(100, (storageUsed / (5 * 1024 * 1024)) * 100).toFixed(1)}%"></div>
          </div>
        </div>
      `;

      if (!filtered.length) {
        const msg = searchTerm ? 'No projects match your search' : 'No saved projects';
        return `${storageBar}<div class="empty-state"><div class="empty-state-icon"><i class="icon icon-folder icon-xl"></i></div><div class="empty-state-text">${msg}</div></div>`;
      }

      return `${storageBar}<div class="project-list">${filtered.map((p) => {
        const isCurrent = projects.currentId === p.id;
        const size = this._formatBytes(projects.getProjectSize(p.id));
        const fileCount = (p.files || []).length;
        const lang = langNames[p.language] || p.language;
        const langIcon = langIcons[p.language] || '📄';
        const isConfirmingDelete = confirmingDelete === p.id;
        const date = formatDate(p.updatedAt || p.createdAt || Date.now());

        return `
          <div class="project-card${isCurrent ? ' active' : ''}" data-id="${p.id}">
            <div class="project-card-main">
              <div class="project-card-icon">${langIcon}</div>
              <div class="project-info">
                <div class="project-name">${escapeHtml(p.name || 'Untitled')}${isCurrent ? ' <span class="pm-current-badge">current</span>' : ''}</div>
                <div class="project-meta">
                  <span class="pm-meta-pill">${lang}</span>
                  <span class="pm-meta-pill">${fileCount} file${fileCount === 1 ? '' : 's'}</span>
                  <span class="pm-meta-pill">${size}</span>
                  <span class="pm-meta-pill">${date}</span>
                </div>
              </div>
            </div>
            <div class="project-actions">
              <button class="btn-icon btn-icon-sm" data-share="${p.id}" title="Share"><i class="icon icon-link icon-sm"></i></button>
              <button class="btn-icon btn-icon-sm" data-export-zip="${p.id}" title="Download ZIP"><i class="icon icon-download icon-sm"></i></button>
              <button class="btn-icon btn-icon-sm" data-duplicate="${p.id}" title="Duplicate"><i class="icon icon-copy icon-sm"></i></button>
              ${isConfirmingDelete
                ? `<button class="btn btn-danger pm-confirm-delete" data-confirm-delete="${p.id}" style="font-size:11px;padding:2px 10px;">Confirm?</button>
                   <button class="btn-icon btn-icon-sm" data-cancel-delete="${p.id}" title="Cancel"><i class="icon icon-x icon-sm"></i></button>`
                : `<button class="btn-icon btn-icon-sm" data-delete="${p.id}" title="Delete" style="color:var(--accent-error)"><i class="icon icon-trash icon-sm"></i></button>`
              }
            </div>
          </div>
        `;
      }).join('')}</div>`;
    };

    /* ─── Modal HTML ─── */
    const el = this._showModal(`
      <div class="modal-header">
        <span class="modal-title"><i class="icon icon-folder icon-sm"></i> Projects</span>
        <button class="btn-icon modal-close-btn" title="Close"><i class="icon icon-x icon-sm"></i></button>
      </div>
      <div class="modal-body">
        <div class="pm-toolbar">
          <div class="pm-toolbar-left">
            <button class="btn btn-primary" id="proj-new-picker">
              <i class="icon icon-plus icon-sm"></i> New Project
            </button>
            <div class="pm-import-group">
              <button class="btn" id="proj-import">
                <i class="icon icon-upload icon-sm"></i> Import
              </button>
              <input type="file" id="proj-import-file" accept=".json,.zip" class="hidden">
            </div>
          </div>
          <div class="pm-toolbar-right">
            <label class="pm-search" aria-label="Search projects">
              <i class="icon icon-file-code icon-xs"></i>
              <input id="proj-search" type="text" placeholder="Search…" autocomplete="off" spellcheck="false">
            </label>
          </div>
        </div>
        <div id="projects-list">${renderList()}</div>
      </div>
    `);

    el.classList.add('modal-projects');
    el.querySelector('.modal-close-btn').addEventListener('click', () => this._closeModal());

    const listEl = el.querySelector('#projects-list');
    const searchInput = el.querySelector('#proj-search');

    const rerender = () => { listEl.innerHTML = renderList(); };

    /* ─── Search ─── */
    searchInput.addEventListener('input', () => {
      searchTerm = searchInput.value;
      rerender();
    });

    /* ─── New project picker ─── */
    el.querySelector('#proj-new-picker').addEventListener('click', () => {
      this._showNewProjectPicker(el, newProject, templates);
    });

    /* ─── Import (JSON or ZIP) ─── */
    const fileInput = el.querySelector('#proj-import-file');
    el.querySelector('#proj-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files.length) return;
      const file = fileInput.files[0];
      try {
        const imported = file.name.endsWith('.zip')
          ? await projects.importZIP(file)
          : await projects.importJSON(file);
        this._closeModal();
        loadProject(imported);
        this.showToast('Project imported', 'success');
      } catch (e) {
        this.showToast('Import failed: ' + e.message, 'error');
      }
    });

    /* ─── Delegate clicks ─── */
    listEl.addEventListener('click', (e) => {
      /* Share link */
      const shareBtn = e.target.closest('[data-share]');
      if (shareBtn) {
        const id = shareBtn.dataset.share;
        const url = projects.generateShareURL(id);
        if (url) {
          navigator.clipboard.writeText(url).then(() => {
            this.showToast('Share link copied to clipboard!', 'success');
          }).catch(() => {
            // Fallback: show URL in a prompt
            prompt('Share URL (too large URLs will not work):', url);
          });
        } else {
          // Too large — offer ZIP instead
          this.showToast('Project too large for URL. Use ZIP export instead.', 'warning');
        }
        return;
      }

      /* Export ZIP */
      const exportZipBtn = e.target.closest('[data-export-zip]');
      if (exportZipBtn) {
        projects.exportZIP(exportZipBtn.dataset.exportZip);
        this.showToast('ZIP downloaded', 'success');
        return;
      }

      /* Duplicate */
      const dupBtn = e.target.closest('[data-duplicate]');
      if (dupBtn) {
        const dup = projects.duplicate(dupBtn.dataset.duplicate);
        if (dup) {
          rerender();
          this.showToast(`Duplicated: ${dup.name}`, 'success');
        }
        return;
      }

      /* Delete — first click = ask confirm */
      const deleteBtn = e.target.closest('[data-delete]');
      if (deleteBtn) {
        confirmingDelete = deleteBtn.dataset.delete;
        rerender();
        return;
      }

      /* Delete — confirm */
      const confirmBtn = e.target.closest('[data-confirm-delete]');
      if (confirmBtn) {
        const id = confirmBtn.dataset.confirmDelete;
        const wasCurrent = projects.currentId === id;
        projects.delete(id);
        confirmingDelete = null;
        rerender();
        this.showToast('Project deleted', 'info');
        if (wasCurrent) {
          const next = projects.loadCurrent();
          if (next) loadProject(next);
          else { this._closeModal(); newProject('python'); }
        }
        return;
      }

      /* Delete — cancel */
      const cancelBtn = e.target.closest('[data-cancel-delete]');
      if (cancelBtn) {
        confirmingDelete = null;
        rerender();
        return;
      }

      /* Load project */
      const card = e.target.closest('.project-card');
      if (card) {
        const proj = projects.switchTo(card.dataset.id);
        if (proj) {
          this._closeModal();
          loadProject(proj);
          this.showToast(`Loaded: ${proj.name}`, 'success');
        }
      }
    });
  }

  /* ─── New Project Picker (language chooser) ─── */

  _showNewProjectPicker(parentEl, newProject, templates) {
    const langs = [
      { id: 'python',     label: 'Python',     icon: '🐍', desc: 'main.py' },
      { id: 'javascript', label: 'JavaScript',  icon: '🟨', desc: 'index.js' },
      { id: 'typescript', label: 'TypeScript',  icon: '🔵', desc: 'index.ts' },
      { id: 'java',       label: 'Java',        icon: '☕', desc: 'Main.java' },
      { id: 'c',          label: 'C',           icon: '⚙️', desc: 'main.c' },
      { id: 'cpp',        label: 'C++',         icon: '⚙️', desc: 'main.cpp' },
      { id: 'csharp',     label: 'C#',          icon: '🟣', desc: 'Program.cs' },
      { id: 'go',         label: 'Go',          icon: '🐹', desc: 'main.go' },
      { id: 'ruby',       label: 'Ruby',        icon: '💎', desc: 'main.rb' },
      { id: 'php',        label: 'PHP',         icon: '🐘', desc: 'index.php' },
    ];

    const grid = langs.map(l => `
      <button class="pm-lang-card" data-lang="${l.id}">
        <span class="pm-lang-icon">${l.icon}</span>
        <span class="pm-lang-label">${l.label}</span>
        <span class="pm-lang-desc">${l.desc}</span>
      </button>
    `).join('');

    const picker = this._showModal(`
      <div class="modal-header">
        <span class="modal-title"><i class="icon icon-plus icon-sm"></i> New Project</span>
        <button class="btn-icon modal-close-btn" title="Close"><i class="icon icon-x icon-sm"></i></button>
      </div>
      <div class="modal-body">
        <p style="margin:0 0 12px;font-size:13px;color:var(--text-secondary)">Choose a language to start with:</p>
        <div class="pm-lang-grid">${grid}</div>
      </div>
    `);

    picker.querySelector('.modal-close-btn').addEventListener('click', () => this._closeModal());

    picker.querySelectorAll('.pm-lang-card').forEach(card => {
      card.addEventListener('click', () => {
        this._closeModal();
        newProject(card.dataset.lang);
      });
    });
  }

  /* ─── Templates Modal ─── */

  showTemplatesModal(templates, onSelect) {
    const all = templates.getAll();
    const langOrder = ['python', 'java', 'c', 'cpp', 'csharp', 'php'];
    const levelOrder = { Beginner: 0, Intermediate: 1, Advanced: 2 };

    const ordered = all.slice().sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
      const levelDiff = (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99);
      if (levelDiff !== 0) return levelDiff;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const availableLanguages = (templates.getLanguages ? templates.getLanguages() : [...new Set(ordered.map((t) => t.language))])
      .sort((a, b) => {
        const ia = langOrder.indexOf(a);
        const ib = langOrder.indexOf(b);
        const wa = ia === -1 ? 999 : ia;
        const wb = ib === -1 ? 999 : ib;
        return wa - wb || a.localeCompare(b);
      });

    let activeLanguage = 'all';
    let searchTerm = '';

    const el = this._showModal(`
      <div class="modal-header">
        <span class="modal-title"><i class="icon icon-layout-template icon-sm"></i> Template Library</span>
        <button class="btn-icon modal-close-btn" title="Close"><i class="icon icon-x icon-sm"></i></button>
      </div>
      <div class="modal-body">
        <div class="template-library">
          <div class="template-library-toolbar">
            <label class="template-library-search" aria-label="Search templates">
              <i class="icon icon-file-code icon-sm"></i>
              <input id="template-search" class="template-library-search-input" type="text" placeholder="Search templates, categories, tags…" autocomplete="off" spellcheck="false">
            </label>
            <span id="template-count" class="template-library-count">0 templates</span>
          </div>

          <div id="template-language-filters" class="template-language-filters"></div>

          <div id="template-grid" class="template-grid"></div>

          <div id="template-empty" class="empty-state template-empty hidden">
            <div class="empty-state-icon"><i class="icon icon-layout-template icon-xl"></i></div>
            <div class="empty-state-text">No templates match your filters</div>
          </div>
        </div>
      </div>
    `);

    el.classList.add('modal-template-library');
    el.querySelector('.modal-close-btn').addEventListener('click', () => this._closeModal());

    const searchInput = el.querySelector('#template-search');
    const filterRow = el.querySelector('#template-language-filters');
    const grid = el.querySelector('#template-grid');
    const empty = el.querySelector('#template-empty');
    const countEl = el.querySelector('#template-count');

    const matchesSearch = (template, query) => {
      if (!query) return true;
      const haystack = [
        template.name,
        template.description,
        template.category,
        this._templateLangLabel(template.language),
        ...(template.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    };

    const computeFiltered = () => {
      const q = searchTerm.trim().toLowerCase();
      const byQuery = ordered.filter((t) => matchesSearch(t, q));
      const filtered = activeLanguage === 'all'
        ? byQuery
        : byQuery.filter((t) => t.language === activeLanguage);
      return { byQuery, filtered };
    };

    const renderFilters = (queryFiltered) => {
      const allCount = queryFiltered.length;
      const mkBtn = (lang) => {
        const count = lang === 'all'
          ? allCount
          : queryFiltered.filter((t) => t.language === lang).length;
        const label = lang === 'all' ? 'All' : this._templateLangLabel(lang);
        const active = activeLanguage === lang;
        const color = LANG_COLORS[lang] || 'var(--text-secondary)';
        return `
          <button
            type="button"
            class="template-language-btn${active ? ' active' : ''}"
            data-lang="${lang}"
            style="--template-lang-color:${color}"
          >
            <span>${escapeHtml(label)}</span>
            <span class="template-language-count">${count}</span>
          </button>
        `;
      };

      filterRow.innerHTML = [mkBtn('all'), ...availableLanguages.map((lang) => mkBtn(lang))].join('');
    };

    const renderGrid = (filtered) => {
      countEl.textContent = `${filtered.length} template${filtered.length === 1 ? '' : 's'}`;

      if (!filtered.length) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
      }

      empty.classList.add('hidden');

      grid.innerHTML = filtered.map((tmpl) => {
        const fileCount = tmpl.files?.length || 0;
        const primaryFile = tmpl.files?.[0]?.name || '';
        const preview = escapeHtml(this._templatePreviewCode(tmpl));
        const levelClass = this._templateLevelClass(tmpl.level);
        const langLabel = this._templateLangLabel(tmpl.language);
        const langColor = LANG_COLORS[tmpl.language] || 'var(--text-secondary)';
        const tags = (tmpl.tags || [])
          .slice(0, 4)
          .map((tag) => `<span class="template-tag">${escapeHtml(tag)}</span>`)
          .join('');

        return `
          <button type="button" class="template-card${tmpl.featured ? ' featured' : ''}" data-tmpl-id="${escapeHtml(tmpl.id)}" style="--template-lang-color:${langColor}">
            <div class="template-card-head">
              <div class="template-card-title-row">
                <span class="template-card-title">${escapeHtml(tmpl.name)}</span>
                ${tmpl.featured ? '<i class="icon icon-star icon-xs template-featured-icon"></i>' : ''}
              </div>
              <div class="template-card-meta">
                <span class="template-pill language">${escapeHtml(langLabel)}</span>
                <span class="template-pill ${levelClass}">${escapeHtml(tmpl.level || 'Beginner')}</span>
                <span class="template-pill category">${escapeHtml(tmpl.category || 'General')}</span>
              </div>
            </div>

            <p class="template-card-desc">${escapeHtml(tmpl.description || 'No description')}</p>

            <pre class="template-preview"><code>${preview}</code></pre>

            ${tags ? `<div class="template-tags">${tags}</div>` : ''}

            <div class="template-card-footer">
              <span class="template-card-fileinfo">${fileCount} file${fileCount === 1 ? '' : 's'}${primaryFile ? ` • ${escapeHtml(primaryFile)}` : ''}</span>
              <span class="template-card-action">Use template</span>
            </div>
          </button>
        `;
      }).join('');
    };

    const render = () => {
      const { byQuery, filtered } = computeFiltered();
      renderFilters(byQuery);
      renderGrid(filtered);
    };

    filterRow.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lang]');
      if (!btn) return;
      activeLanguage = btn.dataset.lang;
      render();
    });

    searchInput.addEventListener('input', () => {
      searchTerm = searchInput.value || '';
      render();
    });

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-tmpl-id]');
      if (!card) return;
      const tmpl = templates.get(card.dataset.tmplId);
      if (!tmpl) return;
      this._closeModal();
      onSelect(tmpl);
    });

    render();
    requestAnimationFrame(() => searchInput.focus());
  }

  _templateLangLabel(language) {
    const labels = {
      python: 'Python',
      java: 'Java',
      c: 'C',
      cpp: 'C++',
      csharp: 'C#',
      php: 'PHP',
    };
    return labels[language] || String(language || '').toUpperCase();
  }

  _templateLevelClass(level) {
    const value = String(level || '').toLowerCase();
    if (value.startsWith('adv')) return 'level-advanced';
    if (value.startsWith('int')) return 'level-intermediate';
    return 'level-beginner';
  }

  _templatePreviewCode(template) {
    const content = template?.files?.[0]?.content || '';
    const lines = content.replace(/\r/g, '').split('\n');
    const previewLines = [];

    for (const line of lines) {
      if (previewLines.length >= 6) break;
      const clipped = line.length > 96 ? `${line.slice(0, 96)}…` : line;
      previewLines.push(clipped);
    }

    const preview = previewLines.join('\n').trim();
    return preview || '// Empty template';
  }

  /* ─── Command Palette ─── */

  showCommandPalette(actions) {
    const el = this._showModal(`
      <div class="command-palette">
        <div class="command-palette-input-wrap">
          <i class="icon icon-terminal icon-sm" style="color:var(--text-muted)"></i>
          <input id="palette-search" class="command-palette-input" type="text" placeholder="Type a command…" autocomplete="off" spellcheck="false">
        </div>
        <div id="palette-results" class="command-palette-results"></div>
      </div>
    `);

    const input = el.querySelector('#palette-search');
    const results = el.querySelector('#palette-results');
    let selectedIdx = 0;

    const renderResults = (filter = '') => {
      const term = filter.toLowerCase();
      const filtered = actions.filter(a => a.label.toLowerCase().includes(term));
      selectedIdx = Math.min(selectedIdx, Math.max(0, filtered.length - 1));

      results.innerHTML = filtered.map((a, i) => `
        <button class="palette-item${i === selectedIdx ? ' selected' : ''}" data-idx="${i}">
          <i class="icon icon-${a.icon} icon-sm"></i>
          <span class="palette-label">${this._highlightMatch(a.label, term)}</span>
          ${a.shortcut ? `<span class="palette-shortcut">${a.shortcut}</span>` : ''}
        </button>
      `).join('');

      // Wire click handlers
      results.querySelectorAll('.palette-item').forEach((btn, i) => {
        btn.addEventListener('click', () => {
          this._closeModal();
          filtered[i]?.action();
        });
        btn.addEventListener('mouseenter', () => {
          selectedIdx = i;
          results.querySelectorAll('.palette-item').forEach((b, j) => b.classList.toggle('selected', j === i));
        });
      });

      return filtered;
    };

    let currentFiltered = renderResults();

    input.addEventListener('input', () => {
      selectedIdx = 0;
      currentFiltered = renderResults(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, currentFiltered.length - 1);
        renderResults(input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        renderResults(input.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._closeModal();
        currentFiltered[selectedIdx]?.action();
      }
    });

    // Focus the input
    requestAnimationFrame(() => input.focus());
  }

  _highlightMatch(label, term) {
    if (!term) return escapeHtml(label);
    const idx = label.toLowerCase().indexOf(term);
    if (idx < 0) return escapeHtml(label);
    const before = label.slice(0, idx);
    const match = label.slice(idx, idx + term.length);
    const after = label.slice(idx + term.length);
    return `${escapeHtml(before)}<strong>${escapeHtml(match)}</strong>${escapeHtml(after)}`;
  }

  /* ─── Keyboard Shortcuts Overlay ─── */

  showShortcutsOverlay() {
    const shortcuts = [
      { keys: `${MOD}+Enter`,   desc: 'Run / Stop' },
      { keys: `${MOD}+S`,       desc: 'Save project' },
      { keys: `${MOD}+N`,       desc: 'New file' },
      { keys: `${MOD}+B`,       desc: 'Toggle sidebar' },
      { keys: `${MOD}+\``,      desc: 'Toggle terminal' },
      { keys: `${MOD}+Shift+Z`, desc: 'Zen mode' },
      { keys: `${MOD}+Shift+P`, desc: 'Command palette' },
      { keys: `${MOD}+/`,       desc: 'This overlay' },
      { keys: 'Esc',            desc: 'Exit zen mode / Close modal' },
    ];

    const rows = shortcuts.map(s => `
      <div class="shortcut-row">
        <span class="shortcut-keys">${s.keys.split('+').map(k => `<kbd>${k.trim()}</kbd>`).join('<span class="shortcut-plus">+</span>')}</span>
        <span class="shortcut-desc">${s.desc}</span>
      </div>
    `).join('');

    const el = this._showModal(`
      <div class="modal-header">
        <span class="modal-title"><i class="icon icon-info icon-sm"></i> Keyboard Shortcuts</span>
        <button class="btn-icon modal-close-btn" title="Close"><i class="icon icon-x icon-sm"></i></button>
      </div>
      <div class="modal-body">
        <div class="shortcuts-grid">${rows}</div>
      </div>
    `);

    el.querySelector('.modal-close-btn').addEventListener('click', () => this._closeModal());
  }
}
