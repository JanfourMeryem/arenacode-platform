/* ═══════════════════════════════════════════════════════════
   AlgoArena — Utilities
   ═══════════════════════════════════════════════════════════ */

export function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function formatDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (c) => map[c]);
}

/** Given a filename, returns the matching language key */
export function langFromFilename(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
    cs: 'csharp',
    php: 'php',
    js: 'javascript', mjs: 'javascript',
    ts: 'typescript',
    go: 'go',
    rb: 'ruby',
  };
  return map[ext] || null;
}

/** Returns the Monaco language ID for a given language key */
export function monacoLangId(language) {
  const map = {
    python: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    csharp: 'csharp',
    php: 'php',
    javascript: 'javascript',
    typescript: 'typescript',
    go: 'go',
    ruby: 'ruby',
  };
  return map[language] || 'plaintext';
}

/** Returns an icon HTML string for a filename (SVG-based via CSS) */
export function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const langMap = {
    py: 'lang-icon-py', java: 'lang-icon-java',
    c: 'lang-icon-c', cpp: 'lang-icon-cpp', cc: 'lang-icon-cpp',
    cs: 'lang-icon-cs', php: 'lang-icon-php',
    js: 'lang-icon-js', mjs: 'lang-icon-js',
    ts: 'lang-icon-ts',
    go: 'lang-icon-go',
    rb: 'lang-icon-rb',
  };
  if (langMap[ext]) {
    return `<i class="icon icon-file-code icon-sm ${langMap[ext]}"></i>`;
  }
  return '<i class="icon icon-file icon-sm"></i>';
}

/** Default entry file name per language */
export const DEFAULT_ENTRY = {
  python:     'main.py',
  java:       'Main.java',
  c:          'main.c',
  cpp:        'main.cpp',
  csharp:     'Program.cs',
  php:        'index.php',
  javascript: 'index.js',
  typescript: 'index.ts',
  go:         'main.go',
  ruby:       'main.rb',
};

/** The OS shortcut modifier key name */
export const MOD = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
export const IS_MAC = navigator.platform.includes('Mac');

/** Language accent colors — used for tab accents and visual indicators */
export const LANG_COLORS = {
  python:     '#3572A5',
  java:       '#b07219',
  c:          '#555555',
  cpp:        '#f34b7d',
  csharp:     '#68217A',
  php:        '#4F5D95',
  javascript: '#f1e05a',
  typescript: '#3178c6',
  go:         '#00ADD8',
  ruby:       '#CC342D',
};

/** Returns the language color for a filename */
export function langColorFromFilename(name) {
  const lang = langFromFilename(name);
  return lang ? LANG_COLORS[lang] : null;
}
