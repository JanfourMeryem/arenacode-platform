import { getAllCourses } from './learn-data.js';

const LAST_LANGUAGE_KEY = 'learn:lastLanguage';

function getLanguageIconMarkup(iconKey, languageName) {
  switch (iconKey) {
    case 'python':
      return `
        <svg viewBox="0 0 48 48" class="language-logo python-logo" role="img" aria-label="Python icon">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#0d1a3b" />
          <path fill="#3776AB" d="M24 8c-7 0-8 3-8 7v4h10v2H10c-3 0-5 2-5 6s2 7 6 7h4v-5c0-4 2-7 8-7h10c3 0 5-2 5-6v-3c0-4-2-8-8-8z" />
          <circle cx="20" cy="14.2" r="1.6" fill="#FFFFFF" />
          <path fill="#FFD343" d="M24 40c7 0 8-3 8-7v-4H22v-2h16c3 0 5-2 5-6s-2-7-6-7h-4v5c0 4-2 7-8 7H15c-3 0-5 2-5 6v3c0 4 2 8 8 8z" />
          <circle cx="28" cy="33.8" r="1.6" fill="#FFFFFF" />
        </svg>
      `;
    case 'javascript':
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="JavaScript icon">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#F7DF1E" />
          <text x="24" y="31" text-anchor="middle" fill="#1A1A1A" font-size="16" font-weight="800" font-family="Inter, Arial, sans-serif">JS</text>
        </svg>
      `;
    case 'typescript':
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="TypeScript icon">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#3178C6" />
          <text x="24" y="31" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="800" font-family="Inter, Arial, sans-serif">TS</text>
        </svg>
      `;
    case 'java':
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="Java icon">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#0d1a3b" />
          <path d="M20 14c2 2-2 3 0 5m5-6c2 3-3 4 0 7m5-8c2 4-3 5-1 8" stroke="#F89820" stroke-width="2" stroke-linecap="round" fill="none" />
          <path d="M15 30h18a5 5 0 0 1-5 5h-8a5 5 0 0 1-5-5z" fill="none" stroke="#5382A1" stroke-width="2" />
          <path d="M32 30h3a2.5 2.5 0 0 1 0 5h-2" fill="none" stroke="#5382A1" stroke-width="2" />
        </svg>
      `;
    case 'c':
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="C icon">
          <polygon points="24,4 40,13 40,35 24,44 8,35 8,13" fill="#3A5EA8" />
          <text x="24" y="31" text-anchor="middle" fill="#FFFFFF" font-size="16" font-weight="800" font-family="Inter, Arial, sans-serif">C</text>
        </svg>
      `;
    case 'cpp':
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="C++ icon">
          <polygon points="24,4 40,13 40,35 24,44 8,35 8,13" fill="#00599C" />
          <text x="22" y="27.5" text-anchor="middle" fill="#FFFFFF" font-size="11.5" font-weight="800" font-family="Inter, Arial, sans-serif">C</text>
          <text x="31" y="23" text-anchor="middle" fill="#FFFFFF" font-size="8.2" font-weight="800" font-family="Inter, Arial, sans-serif">+</text>
          <text x="34" y="26.5" text-anchor="middle" fill="#FFFFFF" font-size="8.2" font-weight="800" font-family="Inter, Arial, sans-serif">+</text>
        </svg>
      `;
    case 'csharp':
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="C# icon">
          <polygon points="24,4 40,13 40,35 24,44 8,35 8,13" fill="#68217A" />
          <text x="20.5" y="27.8" text-anchor="middle" fill="#FFFFFF" font-size="11.5" font-weight="800" font-family="Inter, Arial, sans-serif">C</text>
          <text x="31" y="27.8" text-anchor="middle" fill="#FFFFFF" font-size="10.2" font-weight="800" font-family="Inter, Arial, sans-serif">#</text>
        </svg>
      `;
    case 'go':
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="Go icon">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#00ADD8" />
          <circle cx="19" cy="21" r="2.3" fill="#FFFFFF" />
          <circle cx="29" cy="21" r="2.3" fill="#FFFFFF" />
          <circle cx="19" cy="21" r="1" fill="#0C2840" />
          <circle cx="29" cy="21" r="1" fill="#0C2840" />
          <rect x="14" y="27" width="20" height="6" rx="3" fill="#FFFFFF" />
          <text x="24" y="31.4" text-anchor="middle" fill="#0C2840" font-size="6.8" font-weight="800" font-family="Inter, Arial, sans-serif">GO</text>
        </svg>
      `;
    case 'ruby':
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="Ruby icon">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#0d1a3b" />
          <polygon points="24,8 36,20 30,36 18,36 12,20" fill="#CC342D" />
          <polygon points="24,8 30,20 18,20" fill="#F05B53" />
          <polygon points="18,20 30,20 30,36 18,36" fill="#9E1F19" opacity="0.9" />
        </svg>
      `;
    case 'php':
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="PHP icon">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#0d1a3b" />
          <ellipse cx="24" cy="24" rx="16" ry="10.5" fill="#777BB3" />
          <text x="24" y="27.8" text-anchor="middle" fill="#FFFFFF" font-size="9.2" font-weight="800" font-family="Inter, Arial, sans-serif">PHP</text>
        </svg>
      `;
    default:
      return `
        <svg viewBox="0 0 48 48" class="language-logo" role="img" aria-label="${languageName} icon">
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#1b3466" />
          <text x="24" y="31" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="800" font-family="Inter, Arial, sans-serif">${languageName.slice(0, 2).toUpperCase()}</text>
        </svg>
      `;
  }
}

function makeCard(course, isLastOpened) {
  const anchor = document.createElement('a');
  anchor.className = `language-card${isLastOpened ? ' last-opened' : ''}`;
  anchor.href = `/learn/${course.slug}/`;
  anchor.setAttribute('aria-label', `Open ${course.name} course`);

  anchor.innerHTML = `
    <span class="lang-badge" aria-hidden="true">${getLanguageIconMarkup(course.icon, course.name)}</span>
    <span class="language-name">${course.name}</span>
    <span class="language-arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
    </span>
  `;

  anchor.addEventListener('click', () => {
    localStorage.setItem(LAST_LANGUAGE_KEY, course.slug);
  });

  return anchor;
}

function renderLanguageList() {
  const list = document.getElementById('languageList');
  if (!list) return;

  const courses = getAllCourses();
  const lastOpened = localStorage.getItem(LAST_LANGUAGE_KEY);

  const fragment = document.createDocumentFragment();
  courses.forEach((course) => {
    fragment.appendChild(makeCard(course, lastOpened === course.slug));
  });

  list.innerHTML = '';
  list.appendChild(fragment);
}

renderLanguageList();
