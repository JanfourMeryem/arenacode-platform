(function initArenaI18nEngine(global) {
  const STORAGE_KEY = 'lang';
  const DEFAULT_LANG = 'en';
  const SUPPORTED_LANGS = new Set(['en', 'fr']);

  function normalizeLanguage(lang) {
    const normalized = typeof lang === 'string' ? lang.trim().toLowerCase() : '';
    return SUPPORTED_LANGS.has(normalized) ? normalized : DEFAULT_LANG;
  }

  function readStorageLanguage() {
    try {
      return normalizeLanguage(global.localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG);
    } catch {
      return DEFAULT_LANG;
    }
  }

  let currentLanguage = readStorageLanguage();

  function getDictionary(lang = currentLanguage) {
    const translations = global.ARENA_TRANSLATIONS || {};
    return translations[lang] || translations[DEFAULT_LANG] || {};
  }

  function t(key, fallback = '') {
    const dictionary = getDictionary();
    if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
      return dictionary[key];
    }

    if (currentLanguage !== DEFAULT_LANG) {
      const englishDictionary = getDictionary(DEFAULT_LANG);
      if (Object.prototype.hasOwnProperty.call(englishDictionary, key)) {
        return englishDictionary[key];
      }
    }

    return fallback || key;
  }

  function translateElement(element) {
    if (!element || element.nodeType !== 1) return;

    if (element.hasAttribute('data-i18n')) {
      const key = element.getAttribute('data-i18n');
      const fallback = element.getAttribute('data-i18n-default') || element.textContent;
      element.textContent = t(key, fallback);
    }

    if (element.hasAttribute('data-i18n-placeholder')) {
      const key = element.getAttribute('data-i18n-placeholder');
      const fallback = element.getAttribute('placeholder') || '';
      element.setAttribute('placeholder', t(key, fallback));
    }

    if (element.hasAttribute('data-i18n-title')) {
      const key = element.getAttribute('data-i18n-title');
      const fallback = element.getAttribute('title') || '';
      element.setAttribute('title', t(key, fallback));
    }

    if (element.hasAttribute('data-i18n-aria-label')) {
      const key = element.getAttribute('data-i18n-aria-label');
      const fallback = element.getAttribute('aria-label') || '';
      element.setAttribute('aria-label', t(key, fallback));
    }

    if (element.hasAttribute('data-i18n-value')) {
      const key = element.getAttribute('data-i18n-value');
      const fallback = element.value || '';
      element.value = t(key, fallback);
    }
  }

  function applyTranslations(root = document) {
    const translatable = root.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label], [data-i18n-value]');
    translatable.forEach(translateElement);
    updateLanguageSwitcherState();
  }

  function createLanguageSwitcher() {
    const wrapper = document.createElement('div');
    wrapper.className = 'language-switch';
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', t('lang.switch', 'Language switch'));

    const createButton = (lang, flag, key, ariaKey) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-btn';
      btn.dataset.langOption = lang;
      btn.setAttribute('aria-label', t(ariaKey, lang === 'fr' ? 'Passer en francais' : 'Switch to English'));

      const flagSpan = document.createElement('span');
      flagSpan.className = 'lang-flag';
      flagSpan.textContent = flag;

      const textSpan = document.createElement('span');
      textSpan.className = 'lang-label';
      textSpan.textContent = t(key, lang.toUpperCase());

      btn.append(flagSpan, textSpan);
      btn.addEventListener('click', () => setLanguage(lang));
      return btn;
    };

    wrapper.append(
      createButton('en', '🇬🇧', 'lang.en', 'lang.aria.en'),
      createButton('fr', '🇫🇷', 'lang.fr', 'lang.aria.fr')
    );

    return wrapper;
  }

  function ensureLanguageSwitcher() {
    const containers = document.querySelectorAll('.header-actions');
    containers.forEach((container) => {
      if (container.querySelector('.language-switch')) return;
      container.prepend(createLanguageSwitcher());
    });
  }

  function updateLanguageSwitcherState() {
    document.querySelectorAll('.language-switch').forEach((switcher) => {
      switcher.setAttribute('aria-label', t('lang.switch', 'Language switch'));
      switcher.querySelectorAll('.lang-btn').forEach((button) => {
        const lang = button.dataset.langOption;
        const isActive = lang === currentLanguage;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        const text = button.querySelector('.lang-label');
        if (text) {
          text.textContent = t(`lang.${lang}`, lang.toUpperCase());
        }

        button.setAttribute(
          'aria-label',
          t(`lang.aria.${lang}`, lang === 'fr' ? 'Passer en francais' : 'Switch to English')
        );
      });
    });
  }

  function getLanguage() {
    return currentLanguage;
  }

  function setLanguage(lang) {
    const nextLanguage = normalizeLanguage(lang);
    if (nextLanguage === currentLanguage) return;

    currentLanguage = nextLanguage;
    try {
      global.localStorage.setItem(STORAGE_KEY, currentLanguage);
    } catch {
      // ignore storage errors
    }

    applyTranslations(document);
    global.dispatchEvent(new CustomEvent('arena:languagechange', { detail: { lang: currentLanguage } }));
  }

  function init() {
    ensureLanguageSwitcher();
    applyTranslations(document);
    global.dispatchEvent(new CustomEvent('arena:languagechange', { detail: { lang: currentLanguage } }));
  }

  global.ArenaI18n = {
    setLanguage,
    getLanguage,
    applyTranslations,
    t,
    init,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
