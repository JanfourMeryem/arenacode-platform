/* ═══════════════════════════════════════════════════════════
   AlgoArena — EditorManager (Monaco wrapper)
   ═══════════════════════════════════════════════════════════ */

import { monacoLangId, langFromFilename } from './utils.js';
import { registerAllCompletionProviders } from './CompletionProvider.js';

/* Register language-aware autocompletion once */
let _completionRegistered = false;

export class EditorManager {
  constructor(container) {
    if (!_completionRegistered) {
      registerAllCompletionProviders();
      _completionRegistered = true;
    }
    this.container = container;
    this.models = new Map();          // fileName → ITextModel
    this.viewStates = new Map();      // fileName → ICodeEditorViewState
    this.activeFile = null;
    this.onContentChange = null;      // callback(fileName, content)
    this.onCursorChange = null;       // callback(lineNumber, column)

    this._registerThemes();

    const savedTheme = document.documentElement.getAttribute('data-theme') || 'midnight';

    this._settings = {
      fontSize: 14,
      minimap: true,
      wordWrap: 'off',
      lineNumbers: 'on',
      tabSize: 4,
    };

    this.editor = monaco.editor.create(container, {
      value: '',
      language: 'python',
      theme: this._monacoThemeName(savedTheme),
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: true },
      wordWrap: 'off',
      scrollBeyondLastLine: false,
      automaticLayout: false,
      tabSize: 4,
      insertSpaces: true,
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      renderLineHighlight: 'line',
      padding: { top: 8, bottom: 8 },
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showFunctions: true,
        showClasses: true,
        insertMode: 'replace',
        snippetsPreventQuickSuggestions: false,
      },
      quickSuggestions: { other: true, strings: false, comments: false },
    });

    // Content change listener
    this.editor.onDidChangeModelContent(() => {
      if (this.activeFile && this.onContentChange) {
        const model = this.editor.getModel();
        if (model) {
          this.onContentChange(this.activeFile, model.getValue());
        }
      }
    });

    // Cursor position listener
    this.editor.onDidChangeCursorPosition((e) => {
      if (this.onCursorChange) {
        this.onCursorChange(e.position.lineNumber, e.position.column);
      }
    });
  }

  /* ─── File operations ─── */

  openFile(name, content) {
    // Save view state of previous file
    if (this.activeFile && this.activeFile !== name) {
      this.viewStates.set(this.activeFile, this.editor.saveViewState());
    }

    // Derive language from file extension
    const langId = monacoLangId(langFromFilename(name) || 'python');

    // Create or update model
    if (!this.models.has(name)) {
      const uri = monaco.Uri.parse(`file:///${name}`);
      let model = monaco.editor.getModel(uri);
      if (!model) {
        model = monaco.editor.createModel(content || '', langId, uri);
      } else {
        model.setValue(content || '');
        monaco.editor.setModelLanguage(model, langId);
      }
      this.models.set(name, model);
    } else if (content !== undefined) {
      // Model exists — sync content (e.g. after loading a new project)
      const model = this.models.get(name);
      if (model.getValue() !== content) {
        model.setValue(content || '');
      }
      monaco.editor.setModelLanguage(model, langId);
    }

    const model = this.models.get(name);
    this.editor.setModel(model);
    this.activeFile = name;

    // Restore view state if available
    const viewState = this.viewStates.get(name);
    if (viewState) {
      this.editor.restoreViewState(viewState);
    }

    this.editor.focus();
  }

  closeFile(name) {
    const model = this.models.get(name);
    if (model) {
      model.dispose();
      this.models.delete(name);
    }
    this.viewStates.delete(name);
    if (this.activeFile === name) {
      this.activeFile = null;
    }
  }

  closeAll() {
    for (const [name] of this.models) {
      this.closeFile(name);
    }
  }

  getContent(name) {
    const model = this.models.get(name);
    return model ? model.getValue() : '';
  }

  renameFile(oldName, newName) {
    const model = this.models.get(oldName);
    if (!model) return;
    const content = model.getValue();
    // Derive language from the NEW file extension
    const langId = monacoLangId(langFromFilename(newName) || 'python');
    const viewState = this.viewStates.get(oldName);
    
    model.dispose();
    this.models.delete(oldName);
    this.viewStates.delete(oldName);

    const uri = monaco.Uri.parse(`file:///${newName}`);
    const newModel = monaco.editor.createModel(content, langId, uri);
    this.models.set(newName, newModel);
    if (viewState) this.viewStates.set(newName, viewState);

    if (this.activeFile === oldName) {
      this.activeFile = newName;
      this.editor.setModel(newModel);
      if (viewState) this.editor.restoreViewState(viewState);
    }
  }

  /* ─── Language (no-op: language is derived per-file from file extension) ─── */
  setLanguageForAll(_language) { /* retained for API compat */ }

  /* ─── Theme ─── */

  setTheme(themeName) {
    monaco.editor.setTheme(this._monacoThemeName(themeName));
  }

  _monacoThemeName(appTheme) {
    return `aa-${appTheme}`;
  }

  /* ─── Settings ─── */

  setFontSize(size) {
    this._settings.fontSize = size;
    this.editor.updateOptions({ fontSize: size });
  }

  setMinimap(enabled) {
    this._settings.minimap = enabled;
    this.editor.updateOptions({ minimap: { enabled } });
  }

  setWordWrap(mode) {
    this._settings.wordWrap = mode;
    this.editor.updateOptions({ wordWrap: mode });
  }

  setLineNumbers(mode) {
    this._settings.lineNumbers = mode;
    this.editor.updateOptions({ lineNumbers: mode });
  }

  setTabSize(size) {
    this._settings.tabSize = size;
    this.editor.updateOptions({ tabSize: size });
  }

  getSettings() {
    return { ...this._settings };
  }

  /* ─── Layout ─── */

  layout() {
    this.editor.layout();
  }

  /* ─── Theme Registration ─── */

  _registerThemes() {
    const themes = {
      midnight: { base: 'vs-dark', bg: '#0d1117', fg: '#e6edf3', lineHL: '#161b2288', selection: '#58a6ff33' },
      daylight: { base: 'vs', bg: '#ffffff', fg: '#1f2328', lineHL: '#f6f8fa', selection: '#0969da22' },
      monokai: { base: 'vs-dark', bg: '#272822', fg: '#f8f8f2', lineHL: '#33342d88', selection: '#f9267233' },
      dracula: { base: 'vs-dark', bg: '#282a36', fg: '#f8f8f2', lineHL: '#343746', selection: '#bd93f933' },
      nord: { base: 'vs-dark', bg: '#2e3440', fg: '#eceff4', lineHL: '#3b425288', selection: '#88c0d033' },
      'solarized-dark': { base: 'vs-dark', bg: '#002b36', fg: '#93a1a1', lineHL: '#07364288', selection: '#268bd233' },
      'solarized-light': { base: 'vs', bg: '#fdf6e3', fg: '#586e75', lineHL: '#eee8d5', selection: '#268bd222' },
      synthwave: { base: 'vs-dark', bg: '#262335', fg: '#f0e4fc', lineHL: '#302447', selection: '#ff7edb33' },
      'github-dark': { base: 'vs-dark', bg: '#0d1117', fg: '#c9d1d9', lineHL: '#161b2288', selection: '#f7816633' },
      'high-contrast': { base: 'hc-black', bg: '#000000', fg: '#ffffff', lineHL: '#1a1a1a', selection: '#00ff0033' },
    };

    for (const [name, t] of Object.entries(themes)) {
      monaco.editor.defineTheme(`aa-${name}`, {
        base: t.base,
        inherit: true,
        rules: [],
        colors: {
          'editor.background': t.bg,
          'editor.foreground': t.fg,
          'editor.lineHighlightBackground': t.lineHL,
          'editor.selectionBackground': t.selection,
          'editorCursor.foreground': t.fg,
          'editorWidget.background': t.bg,
          'editorSuggestWidget.background': t.bg,
          'input.background': t.bg,
        },
      });
    }
  }
}
