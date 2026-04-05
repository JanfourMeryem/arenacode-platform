/* ═══════════════════════════════════════════════════════════
   AlgoArena — TerminalManager (xterm.js wrapper)
   ═══════════════════════════════════════════════════════════ */

export class TerminalManager {
  constructor(container) {
    this.container = container;
    this.inputEnabled = false;
    this.inputBuffer = '';
    this._programOutputStarted = false;  // tracks whether we've shown the divider

    /* Callbacks */
    this.onStdinData = null;   // (data:string) — send line to backend
    this.onKillRequest = null; // () — Ctrl+C

    /* xterm themes matching our app themes */
    this._themes = {
      midnight:          { background: '#0a0e14', foreground: '#e6edf3', cursor: '#58a6ff', selectionBackground: '#58a6ff44' },
      daylight:          { background: '#f6f8fa', foreground: '#1f2328', cursor: '#0969da', selectionBackground: '#0969da22' },
      monokai:           { background: '#1e1f1c', foreground: '#f8f8f2', cursor: '#f92672', selectionBackground: '#f9267233' },
      dracula:           { background: '#1e1f29', foreground: '#f8f8f2', cursor: '#bd93f9', selectionBackground: '#bd93f933' },
      nord:              { background: '#272d38', foreground: '#eceff4', cursor: '#88c0d0', selectionBackground: '#88c0d033' },
      'solarized-dark':  { background: '#001e27', foreground: '#93a1a1', cursor: '#268bd2', selectionBackground: '#268bd233' },
      'solarized-light': { background: '#eee8d5', foreground: '#586e75', cursor: '#268bd2', selectionBackground: '#268bd222' },
      synthwave:         { background: '#1a1528', foreground: '#f0e4fc', cursor: '#ff7edb', selectionBackground: '#ff7edb33' },
      'github-dark':     { background: '#090c10', foreground: '#c9d1d9', cursor: '#f78166', selectionBackground: '#f7816633' },
      'high-contrast':   { background: '#000000', foreground: '#ffffff', cursor: '#00ff00', selectionBackground: '#00ff0033' },
    };

    const savedTheme = document.documentElement.getAttribute('data-theme') || 'midnight';

    this.term = new Terminal({
      theme: this._themes[savedTheme] || this._themes.midnight,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      allowProposedApi: true,
    });

    this.fitAddon = new FitAddon.FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(container);

    // Delay first fit to ensure container has layout
    requestAnimationFrame(() => this.fit());

    /* ─── Input handler ─── */
    this.term.onData((data) => {
      if (!this.inputEnabled) return;

      // Ctrl+C → kill
      if (data === '\x03') {
        this.term.write('^C');
        this.onKillRequest?.();
        return;
      }

      // Enter → send buffered line
      if (data === '\r') {
        this.term.write('\r\n');
        this.onStdinData?.(this.inputBuffer + '\n');
        this.inputBuffer = '';
        return;
      }

      // Backspace
      if (data === '\x7f') {
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = this.inputBuffer.slice(0, -1);
          this.term.write('\b \b');
        }
        return;
      }

      // Ignore other control characters (arrows, etc.)
      if (data.charCodeAt(0) < 32 && data !== '\t') return;

      // Printable characters (including paste)
      this.inputBuffer += data;
      this.term.write(data);
    });

    // Welcome
    this._writeWelcome();
  }

  /* ─── Output methods ─── */

  _normalizeLineEndings(data) {
    return String(data).replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  }

  /**
   * Write a "program output" divider if this is the first real program output.
   * Keeps system messages visually separated from user I/O.
   */
  _ensureProgramOutputDivider() {
    if (this._programOutputStarted) return;
    this._programOutputStarted = true;
    const cols = this.term.cols || 60;
    const label = ' Output ';
    const sideLen = Math.max(2, Math.floor((cols - label.length) / 2));
    const line = '─'.repeat(sideLen) + label + '─'.repeat(sideLen);
    this.term.write(`\r\n\x1b[32;1m${line}\x1b[0m\r\n\r\n`);
  }

  write(data) {
    this._ensureProgramOutputDivider();
    this.term.write(this._normalizeLineEndings(data));
    this.term.scrollToBottom();
  }

  writeError(data) {
    this._ensureProgramOutputDivider();
    const normalized = this._normalizeLineEndings(data);
    // Wrap in red ANSI escape
    this.term.write(`\x1b[31m${normalized}\x1b[0m`);
    this.term.scrollToBottom();
  }

  writeSystem(text, color) {
    const colors = { success: '32', error: '31', warning: '33', info: '36' };
    const code = colors[color] || '90'; // default dim
    const normalized = this._normalizeLineEndings(text);
    // Prefix each line with a dim "┃ " gutter to visually distinguish system messages
    const prefix = `\x1b[90m┃\x1b[0m `;
    const prefixed = normalized.split('\r\n')
      .map(line => line === '' ? '' : `${prefix}\x1b[${code}m${line}\x1b[0m`)
      .join('\r\n');
    this.term.write(prefixed);
    this.term.scrollToBottom();
  }

  /**
   * Write a post-execution divider to close the output section.
   */
  writeEndDivider() {
    if (!this._programOutputStarted) return;
    const cols = this.term.cols || 60;
    const line = '─'.repeat(Math.max(10, cols - 2));
    this.term.write(`\r\n\x1b[90m${line}\x1b[0m\r\n`);
    this.term.scrollToBottom();
  }

  /* ─── Control ─── */

  enableInput() { this.inputEnabled = true; }
  disableInput() { this.inputEnabled = false; }

  clear() {
    this.term.clear();
    this.inputBuffer = '';
    this._programOutputStarted = false;
    this.term.write('\x1b[2J\x1b[H'); // Full clear + cursor home
  }

  focus() { this.term.focus(); }

  fit() {
    try {
      this.fitAddon.fit();
    } catch {}
  }

  /* ─── Theme ─── */

  setTheme(themeName) {
    const t = this._themes[themeName];
    if (t) {
      this.term.options.theme = t;
    }
  }

  /* ─── Private ─── */

  _writeWelcome() {
    this.term.write('\x1b[36m⚡ ArenaCode Terminale\x1b[0m\r\n');
    this.term.write('\x1b[90mPress Ctrl+Enter to run • Ctrl+C to stop\x1b[0m\r\n\r\n');
  }

  dispose() {
    this.term.dispose();
  }
}
