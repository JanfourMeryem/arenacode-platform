import { SECTION_TITLES, getCourseBySlug } from './learn-data.js';

const LAST_LANGUAGE_KEY = 'learn:lastLanguage';
const LAST_SECTION_PREFIX = 'learn:lastSection:';
const MOBILE_BREAKPOINT = 1100;
const SECTION_KEY_MAP = Object.freeze({
  Introduction: 'learn.section.introduction',
  Variables: 'learn.section.variables',
  'Input / Output': 'learn.section.io',
  Conditions: 'learn.section.conditions',
  Loops: 'learn.section.loops',
  Functions: 'learn.section.functions',
  'Arrays / Lists': 'learn.section.arrays',
  'Example code': 'learn.section.example',
  'Tips for Arena / Challenge solving': 'learn.section.tips',
});

function t(key, fallback = '') {
  if (window.ArenaI18n && typeof window.ArenaI18n.t === 'function') {
    return window.ArenaI18n.t(key, fallback);
  }
  return fallback || key;
}

function toLocalizedSection(sectionName) {
  const key = SECTION_KEY_MAP[sectionName];
  return key ? t(key, sectionName) : sectionName;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getLanguageSlug() {
  const byDataset = document.body?.dataset?.language;
  if (byDataset) return byDataset.trim().toLowerCase();

  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'learn') return parts[1].toLowerCase();
  return '';
}

function createSectionButton(sectionName, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'section-btn';
  button.textContent = toLocalizedSection(sectionName);
  button.addEventListener('click', () => onClick(sectionName));
  return button;
}

function renderCodeBlock(code) {
  if (!code || !code.content) return '';
  const safeCode = escapeHtml(code.content);
  const safeFile = escapeHtml(code.fileName || 'example.txt');
  return `
    <section class="lesson-code-wrap" aria-label="Code example">
      <div class="lesson-code-head">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
        <span>${safeFile}</span>
      </div>
      <pre class="lesson-code"><code>${safeCode}</code></pre>
    </section>
  `;
}

function renderSectionContent(section, title, article) {
  const paragraphHtml = (section.paragraphs || [])
    .map((paragraph) => `<p class="lesson-subtitle">${escapeHtml(paragraph)}</p>`)
    .join('');

  const listHtml = Array.isArray(section.list) && section.list.length
    ? `<ul class="lesson-list">${section.list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';

  article.innerHTML = `
    <h1 class="lesson-title">${escapeHtml(section.title || title)}</h1>
    ${paragraphHtml}
    ${listHtml}
    ${renderCodeBlock(section.code)}
  `;
}

function initSidebarToggle(shell) {
  const toggle = document.getElementById('sidebarToggle');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!toggle || !shell) return;

  const isMobileView = () => window.innerWidth <= MOBILE_BREAKPOINT;

  const syncSidebarMode = () => {
    if (isMobileView()) {
      shell.classList.remove('sidebar-collapsed');
    } else {
      shell.classList.remove('sidebar-open');
    }
  };

  const closeMobile = () => {
    shell.classList.remove('sidebar-open');
  };

  syncSidebarMode();

  toggle.addEventListener('click', () => {
    if (isMobileView()) {
      shell.classList.remove('sidebar-collapsed');
      shell.classList.toggle('sidebar-open');
      return;
    }
    shell.classList.remove('sidebar-open');
    shell.classList.toggle('sidebar-collapsed');
  });

  backdrop?.addEventListener('click', closeMobile);

  window.addEventListener('resize', syncSidebarMode);
}

function initCoursePage() {
  const slug = getLanguageSlug();
  const course = getCourseBySlug(slug);
  if (!course) {
    window.location.replace('/learn/');
    return;
  }

  localStorage.setItem(LAST_LANGUAGE_KEY, course.slug);

  const sectionNav = document.getElementById('sectionNav');
  const article = document.getElementById('courseArticle');
  const shell = document.getElementById('learnCourseShell');
  const pathLanguage = document.getElementById('pathLanguage');
  const pathSection = document.getElementById('pathSection');
  const progressBar = document.getElementById('courseProgressBar');

  if (!sectionNav || !article || !shell) return;

  initSidebarToggle(shell);

  const buttonsBySection = new Map();
  const sectionStorageKey = `${LAST_SECTION_PREFIX}${course.slug}`;
  const storedSection = localStorage.getItem(sectionStorageKey);
  let activeSection = SECTION_TITLES.includes(storedSection) ? storedSection : SECTION_TITLES[0];

  const setActiveSection = (sectionName) => {
    const sectionData = course.sections[sectionName];
    if (!sectionData) return;

    activeSection = sectionName;
    localStorage.setItem(sectionStorageKey, sectionName);

    buttonsBySection.forEach((button, key) => {
      button.classList.toggle('active', key === sectionName);
    });

    renderSectionContent(sectionData, sectionName, article);

    if (pathLanguage) pathLanguage.textContent = course.name;
    if (pathSection) pathSection.textContent = toLocalizedSection(sectionName);

    const index = SECTION_TITLES.indexOf(sectionName);
    const progress = ((index + 1) / SECTION_TITLES.length) * 100;
    if (progressBar) progressBar.style.width = `${progress}%`;

    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      shell.classList.remove('sidebar-open');
    }
  };

  sectionNav.innerHTML = '';
  SECTION_TITLES.forEach((sectionName) => {
    const button = createSectionButton(sectionName, setActiveSection);
    buttonsBySection.set(sectionName, button);
    sectionNav.appendChild(button);
  });

  setActiveSection(activeSection);

  window.addEventListener('arena:languagechange', () => {
    buttonsBySection.forEach((button, sectionName) => {
      button.textContent = toLocalizedSection(sectionName);
    });
    setActiveSection(activeSection);
  });
}

initCoursePage();
