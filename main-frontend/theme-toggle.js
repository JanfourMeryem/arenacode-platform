(function initArenaThemeSystem(global) {
  const DEFAULT_STORAGE_KEY = 'arenacode-theme';
  const LEGACY_KEYS = ['theme', 'labyrinth-theme', 'treasure-theme'];
  const CHALLENGE_SLUG_ALIASES = Object.freeze({
    'solo-snake': 'snake',
    'course-tr-sor': 'treasure',
    'course-tr-c3-a9sor': 'treasure',
    'course-tresor': 'treasure',
    'treasure-run': 'treasure',
  });

  function normalizeTheme(value) {
    if (typeof value !== 'string') return null;
    const theme = value.trim().toLowerCase();
    if (theme === 'dark' || theme === 'midnight') return 'dark';
    if (theme === 'light' || theme === 'daylight') return 'light';
    return null;
  }

  function normalizeSegment(value, fallback = 'default') {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const normalized = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return normalized || fallback;
  }

  function normalizeChallengeName(value) {
    const source = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!source) return '';

    let decoded = source;
    try {
      decoded = decodeURIComponent(source);
    } catch {
      decoded = source;
    }

    const raw = normalizeSegment(decoded, '');
    const encodedRaw = normalizeSegment(source, '');
    if (!raw && !encodedRaw) return '';

    const normalized = raw || encodedRaw;
    const withoutSoloPrefix = normalized.replace(/^solo-/, '');

    return (
      CHALLENGE_SLUG_ALIASES[normalized]
      || CHALLENGE_SLUG_ALIASES[withoutSoloPrefix]
      || CHALLENGE_SLUG_ALIASES[encodedRaw]
      || withoutSoloPrefix
      || normalized
    );
  }

  function resolveChallengeFromPath(pathname) {
    const match = pathname.match(/^\/challenges\/games\/([^/?#]+)/i);
    if (!match) return '';
    return normalizeChallengeName(match[1]);
  }

  function resolveStorageKey() {
    const path = (global.location?.pathname || '').toLowerCase();
    const params = new URLSearchParams(global.location?.search || '');
    const embed = (params.get('embed') || '').trim().toLowerCase();
    const challengeFromQuery = normalizeChallengeName(params.get('challenge'));
    const challengeFromPath = resolveChallengeFromPath(path);
    const challengeName = challengeFromQuery || challengeFromPath;
    const isPlaygroundPath = path.startsWith('/playground/') || path.startsWith('/playground/client/');
    const isChallengeGamePath = Boolean(challengeFromPath);

    if (!isPlaygroundPath && !isChallengeGamePath) {
      return DEFAULT_STORAGE_KEY;
    }

    if (embed === 'challenge' || challengeName) {
      return `arenacode-theme:challenge:${challengeName || 'default'}`;
    }

    return 'arenacode-theme:playground';
  }

  const STORAGE_KEY = resolveStorageKey();
  const IS_PLAYGROUND_CONTEXT = STORAGE_KEY === 'arenacode-theme:playground';
  const IS_CHALLENGE_CONTEXT = STORAGE_KEY.startsWith('arenacode-theme:challenge:');

  function safeGet(key) {
    try {
      return global.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors in private mode / restricted contexts.
    }
  }

  function usesMidnightMapping() {
    const root = document.documentElement;
    const explicitModel = (root.dataset.themeModel || '').trim().toLowerCase();
    if (explicitModel === 'midnight-daylight') return true;
    const current = (root.getAttribute('data-theme') || '').trim().toLowerCase();
    return current === 'midnight' || current === 'daylight';
  }

  function toDocumentTheme(globalTheme) {
    if (usesMidnightMapping()) {
      return globalTheme === 'light' ? 'daylight' : 'midnight';
    }
    return globalTheme;
  }

  function fromDocumentTheme(documentTheme) {
    if (documentTheme === 'midnight') return 'dark';
    if (documentTheme === 'daylight') return 'light';
    return normalizeTheme(documentTheme);
  }

  function getThemeFromStorage() {
    const stored = normalizeTheme(safeGet(STORAGE_KEY));
    if (stored) return stored;

    if (IS_CHALLENGE_CONTEXT) {
      return 'dark';
    }

    if (IS_PLAYGROUND_CONTEXT) {
      const legacyGlobal = normalizeTheme(safeGet(DEFAULT_STORAGE_KEY));
      if (legacyGlobal) {
        safeSet(STORAGE_KEY, legacyGlobal);
        return legacyGlobal;
      }
    }

    for (const key of LEGACY_KEYS) {
      const legacy = normalizeTheme(safeGet(key));
      if (legacy) {
        safeSet(STORAGE_KEY, legacy);
        return legacy;
      }
    }

    return 'dark';
  }

  function getTheme() {
    const fromDom = fromDocumentTheme((document.documentElement.getAttribute('data-theme') || '').trim().toLowerCase());
    return fromDom || normalizeTheme(safeGet(STORAGE_KEY)) || 'dark';
  }

  function updateToggleButtons(theme) {
    const isDark = theme === 'dark';
    const title = isDark ? 'Switch to light mode' : 'Switch to dark mode';

    document.querySelectorAll('[data-global-theme-toggle]').forEach((button) => {
      button.setAttribute('title', title);
      button.setAttribute('aria-label', title);
      button.setAttribute('data-theme-state', theme);
    });
  }

  function applyTheme(theme, options = {}) {
    const normalized = normalizeTheme(theme) || 'dark';
    const mappedTheme = toDocumentTheme(normalized);

    document.documentElement.setAttribute('data-theme', mappedTheme);
    if (options.persist !== false) {
      safeSet(STORAGE_KEY, normalized);
    }

    updateToggleButtons(normalized);

    if (options.emit !== false) {
      global.dispatchEvent(new CustomEvent('arenacode:themechange', {
        detail: {
          theme: normalized,
          documentTheme: mappedTheme,
          storageKey: STORAGE_KEY,
        },
      }));
    }

    return normalized;
  }

  function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    return applyTheme(next);
  }

  function bindGlobalToggleButtons() {
    document.querySelectorAll('[data-global-theme-toggle]').forEach((button) => {
      if (button.dataset.themeBound === '1') return;
      button.dataset.themeBound = '1';
      button.addEventListener('click', () => {
        toggleTheme();
      });
    });
  }

  function initGlobalTheme() {
    const initialTheme = getThemeFromStorage();
    applyTheme(initialTheme, { persist: false, emit: false });
    bindGlobalToggleButtons();
  }

  global.ArenaTheme = {
    STORAGE_KEY,
    getStorageKey: () => STORAGE_KEY,
    initGlobalTheme,
    getTheme,
    readStoredTheme: getThemeFromStorage,
    applyTheme,
    toggleTheme,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalTheme, { once: true });
  } else {
    initGlobalTheme();
  }

  global.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    const nextTheme = normalizeTheme(event.newValue) || 'dark';
    // Re-emit locally so Monaco/xterm listeners can update when another tab/iframe changes theme.
    applyTheme(nextTheme, { persist: false, emit: true });
  });
})(window);
