/* ═══════════════════════════════════════════════════════════
   AlgoArena — TemplateManager
   ═══════════════════════════════════════════════════════════ */

const DEFAULT_ENTRY = {
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

const LANGUAGE_LABELS = {
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  php: 'PHP',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  go: 'Go',
  ruby: 'Ruby',
};

const TEMPLATE_LEVELS = new Set(['Beginner', 'Intermediate', 'Advanced']);

export class TemplateManager {
  constructor() {
    this.templates = [];

    /* Fallback starter code (used if JSON fails to load) */
    this._starters = {
      python: 'print("Welcome to Python playground")\n',
      java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to Java playground");\n    }\n}\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    printf("Welcome to C playground\\n");\n    return 0;\n}\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Welcome to C++ playground" << endl;\n    return 0;\n}\n',
      csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Welcome to C# playground");\n    }\n}\n',
      php: '<?php\necho "Welcome to PHP playground\\n";\n',
      javascript: 'console.log("Welcome to JavaScript playground");\n',
      typescript: 'const greeting: string = "Welcome to TypeScript playground";\nconsole.log(greeting);\n',
      go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Welcome to Go playground")\n}\n',
      ruby: 'puts "Welcome to Ruby playground"\n',
    };
  }

  async load() {
    let raw = null;

    try {
      const res = await fetch('templates/defaults.json');
      if (res.ok) {
        raw = await res.json();
      }
    } catch {
      console.warn('Could not load templates JSON, falling back to built-in library.');
    }

    const normalized = this._normalizeTemplates(raw);
    this.templates = normalized.length ? normalized : this._buildFallbackLibrary();
  }

  getAll() {
    return this.templates.slice();
  }

  getByLanguage(language) {
    return this.templates.filter((t) => t.language === language);
  }

  getLanguages() {
    return [...new Set(this.templates.map((t) => t.language))];
  }

  get(id) {
    return this.templates.find((t) => t.id === id);
  }

  getStarterCode(language) {
    return this._starters[language] || '// Start coding here\n';
  }

  getStarterFiles(language) {
    const entry = DEFAULT_ENTRY[language] || 'main.txt';
    return [{ name: entry, content: this.getStarterCode(language) }];
  }

  getLanguageLabel(language) {
    return LANGUAGE_LABELS[language] || String(language || '').trim() || 'Code';
  }

  _normalizeLanguage(lang) {
    const map = {
      python: 'python',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      'c++': 'cpp',
      cc: 'cpp',
      cxx: 'cpp',
      csharp: 'csharp',
      'c#': 'csharp',
      cs: 'csharp',
      php: 'php',
      javascript: 'javascript',
      js: 'javascript',
      typescript: 'typescript',
      ts: 'typescript',
      go: 'go',
      golang: 'go',
      ruby: 'ruby',
      rb: 'ruby',
    };

    if (!lang) return null;
    return map[String(lang).toLowerCase()] || null;
  }

  _normalizeTemplates(rawTemplates) {
    const list = Array.isArray(rawTemplates)
      ? rawTemplates
      : (Array.isArray(rawTemplates?.templates) ? rawTemplates.templates : []);

    return list
      .map((t, idx) => {
        const language = this._normalizeLanguage(t?.language);
        if (!language) return null;

        const files = Array.isArray(t?.files)
          ? t.files
            .filter((f) => f && typeof f.name === 'string' && typeof f.content === 'string')
            .map((f) => ({ name: f.name, content: f.content }))
          : [];

        if (!files.length) {
          files.push({
            name: DEFAULT_ENTRY[language] || 'main.txt',
            content: this.getStarterCode(language),
          });
        }

        const rawLevel = typeof t?.level === 'string' ? t.level : 'Beginner';
        const level = TEMPLATE_LEVELS.has(rawLevel) ? rawLevel : 'Beginner';

        return {
          id: typeof t?.id === 'string' ? t.id : `${language}-template-${idx + 1}`,
          name: typeof t?.name === 'string' ? t.name : `Template ${idx + 1}`,
          description: typeof t?.description === 'string' ? t.description : '',
          language,
          category: typeof t?.category === 'string' ? t.category : 'General',
          level,
          tags: Array.isArray(t?.tags)
            ? t.tags.filter((tag) => typeof tag === 'string' && tag.trim()).slice(0, 6)
            : [],
          featured: Boolean(t?.featured),
          files,
        };
      })
      .filter(Boolean);
  }

  _buildFallbackLibrary() {
    return Object.entries(this._starters).map(([language, content]) => ({
      id: `${language}-starter`,
      name: 'Starter Template',
      description: 'A clean starting point for quick experiments.',
      language,
      category: 'Basics',
      level: 'Beginner',
      tags: ['starter'],
      featured: true,
      files: [{ name: DEFAULT_ENTRY[language] || 'main.txt', content }],
    }));
  }
}
