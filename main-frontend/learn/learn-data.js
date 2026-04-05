export const SECTION_TITLES = [
  'Introduction',
  'Variables',
  'Input / Output',
  'Conditions',
  'Loops',
  'Functions',
  'Arrays / Lists',
  'Example code',
  'Tips for Arena / Challenge solving',
];

const LANGUAGE_PROFILES = {
  python: {
    slug: 'python',
    name: 'Python',
    badge: 'Py',
    icon: 'python',
    fileName: 'main.py',
    color: '#7ce5ff',
    intro: 'Python is concise and perfect for challenge solving.',
    snippets: {
      variables: `score = 0\nname = "Ada"\nis_ready = True`,
      io: `w, h = map(int, input().split())\nstart_x, start_y = map(int, input().split())\nprint(start_x, start_y)`,
      conditions: `if score >= 10:\n    print("win")\nelse:\n    print("keep going")`,
      loops: `for i in range(5):\n    print(i)\n\nwhile score < 3:\n    score += 1`,
      functions: `def best_lane(left, center, right):\n    return max((left, 1), (center, 2), (right, 3))[1]`,
      arrays: `lanes = [3, 5, 2]\nlanes.append(8)\nprint(lanes[0])`,
      example: `n = int(input())\nfor _ in range(n):\n    left, center, right = map(int, input().split())\n    if left >= center and left >= right:\n        print(1)\n    elif center >= right:\n        print(2)\n    else:\n        print(3)`,
    },
  },
  javascript: {
    slug: 'javascript',
    name: 'JavaScript',
    badge: 'JS',
    icon: 'javascript',
    fileName: 'main.js',
    color: '#ffcf66',
    intro: 'JavaScript in Arena runs with Node.js style stdin parsing.',
    snippets: {
      variables: `let score = 0;\nconst player = "Ada";\nlet active = true;`,
      io: `const data = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/);\nlet i = 0;\nconst w = Number(data[i++]);\nconst h = Number(data[i++]);\nconsole.log(w, h);`,
      conditions: `if (score >= 10) {\n  console.log('win');\n} else {\n  console.log('keep going');\n}`,
      loops: `for (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n\nwhile (score < 3) {\n  score++;\n}`,
      functions: `function bestLane(left, center, right) {\n  if (left >= center && left >= right) return 1;\n  if (center >= right) return 2;\n  return 3;\n}`,
      arrays: `const lanes = [3, 5, 2];\nlanes.push(8);\nconsole.log(lanes[0]);`,
      example: `const tokens = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/);\nlet p = 0;\nconst n = Number(tokens[p++]);\nconst out = [];\nfor (let step = 0; step < n; step++) {\n  const left = Number(tokens[p++]);\n  const center = Number(tokens[p++]);\n  const right = Number(tokens[p++]);\n  out.push(left >= center && left >= right ? 1 : (center >= right ? 2 : 3));\n}\nprocess.stdout.write(out.join('\\n'));`,
    },
  },
  typescript: {
    slug: 'typescript',
    name: 'TypeScript',
    badge: 'TS',
    icon: 'typescript',
    fileName: 'main.ts',
    color: '#7caeff',
    intro: 'TypeScript is JavaScript with type safety.',
    snippets: {
      variables: `let score: number = 0;\nconst player: string = "Ada";\nlet active: boolean = true;`,
      io: `const fs = require('fs');\nconst data: string[] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\nlet i = 0;\nconst w: number = Number(data[i++]);`,
      conditions: `if (score >= 10) {\n  console.log('win');\n} else {\n  console.log('keep going');\n}`,
      loops: `for (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n\nwhile (score < 3) {\n  score++;\n}`,
      functions: `function bestLane(left: number, center: number, right: number): number {\n  if (left >= center && left >= right) return 1;\n  if (center >= right) return 2;\n  return 3;\n}`,
      arrays: `const lanes: number[] = [3, 5, 2];\nlanes.push(8);\nconsole.log(lanes[0]);`,
      example: `const tokens: string[] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/);\nlet p = 0;\nconst n: number = Number(tokens[p++]);\nconst out: number[] = [];\nfor (let step = 0; step < n; step++) {\n  const left = Number(tokens[p++]);\n  const center = Number(tokens[p++]);\n  const right = Number(tokens[p++]);\n  out.push(left >= center && left >= right ? 1 : (center >= right ? 2 : 3));\n}\nprocess.stdout.write(out.join('\\n'));`,
    },
  },
  java: {
    slug: 'java',
    name: 'Java',
    badge: 'J',
    icon: 'java',
    fileName: 'Main.java',
    color: '#ff9b78',
    intro: 'Java is strict, fast, and reliable in coding challenges.',
    snippets: {
      variables: `int score = 0;\nString player = "Ada";\nboolean active = true;`,
      io: `Scanner sc = new Scanner(System.in);\nint w = sc.nextInt();\nint h = sc.nextInt();\nSystem.out.println(w + " " + h);`,
      conditions: `if (score >= 10) {\n    System.out.println("win");\n} else {\n    System.out.println("keep going");\n}`,
      loops: `for (int i = 0; i < 5; i++) {\n    System.out.println(i);\n}\n\nwhile (score < 3) {\n    score++;\n}`,
      functions: `static int bestLane(int left, int center, int right) {\n    if (left >= center && left >= right) return 1;\n    if (center >= right) return 2;\n    return 3;\n}`,
      arrays: `int[] lanes = {3, 5, 2};\nSystem.out.println(lanes[0]);`,
      example: `import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int n = sc.nextInt();\n    StringBuilder out = new StringBuilder();\n    for (int step = 0; step < n; step++) {\n      int left = sc.nextInt();\n      int center = sc.nextInt();\n      int right = sc.nextInt();\n      int move = (left >= center && left >= right) ? 1 : ((center >= right) ? 2 : 3);\n      out.append(move).append('\\n');\n    }\n    System.out.print(out);\n  }\n}`,
    },
  },
  c: {
    slug: 'c',
    name: 'C',
    badge: 'C',
    icon: 'c',
    fileName: 'main.c',
    color: '#8bb3ff',
    intro: 'C gives full control and predictable performance.',
    snippets: {
      variables: `int score = 0;\nchar player[] = "Ada";\nint active = 1;`,
      io: `int w, h;\nscanf("%d %d", &w, &h);\nprintf("%d %d\\n", w, h);`,
      conditions: `if (score >= 10) {\n    printf("win\\n");\n} else {\n    printf("keep going\\n");\n}`,
      loops: `for (int i = 0; i < 5; i++) {\n    printf("%d\\n", i);\n}\n\nwhile (score < 3) {\n    score++;\n}`,
      functions: `int best_lane(int left, int center, int right) {\n    if (left >= center && left >= right) return 1;\n    if (center >= right) return 2;\n    return 3;\n}`,
      arrays: `int lanes[3] = {3, 5, 2};\nprintf("%d\\n", lanes[0]);`,
      example: `#include <stdio.h>\n\nint main(void) {\n  int n;\n  if (scanf(\"%d\", &n) != 1) return 0;\n  for (int step = 0; step < n; step++) {\n    int left, center, right;\n    scanf(\"%d %d %d\", &left, &center, &right);\n    if (left >= center && left >= right) printf(\"1\\n\");\n    else if (center >= right) printf(\"2\\n\");\n    else printf(\"3\\n\");\n  }\n  return 0;\n}`,
    },
  },
  cpp: {
    slug: 'cpp',
    name: 'C++',
    badge: 'C++',
    icon: 'cpp',
    fileName: 'main.cpp',
    color: '#8ec7ff',
    intro: 'C++ is one of the most used languages in competitive coding.',
    snippets: {
      variables: `int score = 0;\nstring player = "Ada";\nbool active = true;`,
      io: `int w, h;\ncin >> w >> h;\ncout << w << " " << h << "\\n";`,
      conditions: `if (score >= 10) {\n    cout << "win\\n";\n} else {\n    cout << "keep going\\n";\n}`,
      loops: `for (int i = 0; i < 5; i++) {\n    cout << i << "\\n";\n}\n\nwhile (score < 3) {\n    score++;\n}`,
      functions: `int bestLane(int left, int center, int right) {\n    if (left >= center && left >= right) return 1;\n    if (center >= right) return 2;\n    return 3;\n}`,
      arrays: `vector<int> lanes = {3, 5, 2};\ncout << lanes[0] << "\\n";`,
      example: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n\n  int n;\n  if (!(cin >> n)) return 0;\n  for (int step = 0; step < n; step++) {\n    int left, center, right;\n    cin >> left >> center >> right;\n    if (left >= center && left >= right) cout << 1 << '\\n';\n    else if (center >= right) cout << 2 << '\\n';\n    else cout << 3 << '\\n';\n  }\n}`,
    },
  },
  csharp: {
    slug: 'csharp',
    name: 'C#',
    badge: 'C#',
    icon: 'csharp',
    fileName: 'Program.cs',
    color: '#b89cff',
    intro: 'C# offers clean syntax and strong tooling.',
    snippets: {
      variables: `int score = 0;\nstring player = "Ada";\nbool active = true;`,
      io: `var parts = Console.ReadLine()!.Split();\nint w = int.Parse(parts[0]);\nint h = int.Parse(parts[1]);\nConsole.WriteLine($\"{w} {h}\");`,
      conditions: `if (score >= 10)\n{\n    Console.WriteLine(\"win\");\n}\nelse\n{\n    Console.WriteLine(\"keep going\");\n}`,
      loops: `for (int i = 0; i < 5; i++)\n{\n    Console.WriteLine(i);\n}\n\nwhile (score < 3)\n{\n    score++;\n}`,
      functions: `static int BestLane(int left, int center, int right)\n{\n    if (left >= center && left >= right) return 1;\n    if (center >= right) return 2;\n    return 3;\n}`,
      arrays: `int[] lanes = { 3, 5, 2 };\nConsole.WriteLine(lanes[0]);`,
      example: `int n = int.Parse(Console.ReadLine()!);\nfor (int step = 0; step < n; step++)\n{\n    var row = Console.ReadLine()!.Split();\n    int left = int.Parse(row[0]);\n    int center = int.Parse(row[1]);\n    int right = int.Parse(row[2]);\n\n    if (left >= center && left >= right) Console.WriteLine(1);\n    else if (center >= right) Console.WriteLine(2);\n    else Console.WriteLine(3);\n}`,
    },
  },
  go: {
    slug: 'go',
    name: 'Go',
    badge: 'Go',
    icon: 'go',
    fileName: 'main.go',
    color: '#7de3c2',
    intro: 'Go is simple, fast to compile, and easy to read.',
    snippets: {
      variables: `score := 0\nplayer := "Ada"\nactive := true`,
      io: `in := bufio.NewReader(os.Stdin)\nvar w, h int\nfmt.Fscan(in, &w, &h)\nfmt.Println(w, h)`,
      conditions: `if score >= 10 {\n    fmt.Println("win")\n} else {\n    fmt.Println("keep going")\n}`,
      loops: `for i := 0; i < 5; i++ {\n    fmt.Println(i)\n}\n\nfor score < 3 {\n    score++\n}`,
      functions: `func bestLane(left, center, right int) int {\n    if left >= center && left >= right { return 1 }\n    if center >= right { return 2 }\n    return 3\n}`,
      arrays: `lanes := []int{3, 5, 2}\nfmt.Println(lanes[0])`,
      example: `package main\n\nimport (\n  \"bufio\"\n  \"fmt\"\n  \"os\"\n)\n\nfunc main() {\n  in := bufio.NewReader(os.Stdin)\n  out := bufio.NewWriter(os.Stdout)\n  defer out.Flush()\n\n  var n int\n  fmt.Fscan(in, &n)\n  for step := 0; step < n; step++ {\n    var left, center, right int\n    fmt.Fscan(in, &left, &center, &right)\n    if left >= center && left >= right {\n      fmt.Fprintln(out, 1)\n    } else if center >= right {\n      fmt.Fprintln(out, 2)\n    } else {\n      fmt.Fprintln(out, 3)\n    }\n  }\n}`,
    },
  },
  ruby: {
    slug: 'ruby',
    name: 'Ruby',
    badge: 'Rb',
    icon: 'ruby',
    fileName: 'main.rb',
    color: '#ff9ca6',
    intro: 'Ruby is expressive and great for readable challenge scripts.',
    snippets: {
      variables: `score = 0\nplayer = "Ada"\nactive = true`,
      io: `tokens = STDIN.read.split\nidx = 0\nw = tokens[idx].to_i; idx += 1\nh = tokens[idx].to_i; idx += 1\nputs \"#{w} #{h}\"`,
      conditions: `if score >= 10\n  puts 'win'\nelse\n  puts 'keep going'\nend`,
      loops: `5.times do |i|\n  puts i\nend\n\nwhile score < 3\n  score += 1\nend`,
      functions: `def best_lane(left, center, right)\n  return 1 if left >= center && left >= right\n  return 2 if center >= right\n  3\nend`,
      arrays: `lanes = [3, 5, 2]\nlanes << 8\nputs lanes[0]`,
      example: `tokens = STDIN.read.split\nidx = 0\nn = tokens[idx].to_i\nidx += 1\n\nn.times do\n  left = tokens[idx].to_i\n  center = tokens[idx + 1].to_i\n  right = tokens[idx + 2].to_i\n  idx += 3\n\n  if left >= center && left >= right\n    puts 1\n  elsif center >= right\n    puts 2\n  else\n    puts 3\n  end\nend`,
    },
  },
  php: {
    slug: 'php',
    name: 'PHP',
    badge: 'PHP',
    icon: 'php',
    fileName: 'main.php',
    color: '#9fb4ff',
    intro: 'PHP can solve stdin-based algorithmic challenges effectively.',
    snippets: {
      variables: `$score = 0;\n$player = "Ada";\n$active = true;`,
      io: `$parts = explode(' ', trim(fgets(STDIN)));\n$w = (int)$parts[0];\n$h = (int)$parts[1];\necho $w . \" \" . $h . PHP_EOL;`,
      conditions: `if ($score >= 10) {\n    echo \"win\\n\";\n} else {\n    echo \"keep going\\n\";\n}`,
      loops: `for ($i = 0; $i < 5; $i++) {\n    echo $i . PHP_EOL;\n}\n\nwhile ($score < 3) {\n    $score++;\n}`,
      functions: `function bestLane(int $left, int $center, int $right): int {\n    if ($left >= $center && $left >= $right) return 1;\n    if ($center >= $right) return 2;\n    return 3;\n}`,
      arrays: `$lanes = [3, 5, 2];\n$lanes[] = 8;\necho $lanes[0] . PHP_EOL;`,
      example: `$n = (int)trim(fgets(STDIN));\nfor ($step = 0; $step < $n; $step++) {\n    $parts = explode(' ', trim(fgets(STDIN)));\n    $left = (int)$parts[0];\n    $center = (int)$parts[1];\n    $right = (int)$parts[2];\n\n    if ($left >= $center && $left >= $right) echo \"1\\n\";\n    else if ($center >= $right) echo \"2\\n\";\n    else echo \"3\\n\";\n}`,
    },
  },
};

export const LANGUAGE_ORDER = Object.keys(LANGUAGE_PROFILES);

function buildTipsSection(profile) {
  return {
    title: 'Tips for Arena / Challenge solving',
    paragraphs: [
      `Use ${profile.name} with a strict challenge mindset: read input once, compute, print only the requested output.`,
      'Always verify your output format before running final submissions.',
    ],
    list: [
      'Read all input tokens carefully, in the expected order.',
      'Print only the required values. Avoid extra debug prints.',
      'Keep loops bounded to avoid infinite execution.',
      'Use clear conditions for edge cases (empty input, borders, ties).',
      'Match move/output mapping exactly as described in the statement.',
      `Test with small custom cases first in ${profile.fileName}.`,
    ],
    code: null,
  };
}

function buildCourse(profile) {
  return {
    ...profile,
    sections: {
      Introduction: {
        title: `${profile.name} basics for Arena`,
        paragraphs: [
          profile.intro,
          `In Arena challenges, your solution usually lives in ${profile.fileName} and reads from standard input.`,
          'Focus on clarity: parse input, decide moves, print final answers.',
        ],
        code: null,
      },
      Variables: {
        title: `${profile.name} variables`,
        paragraphs: [
          'Variables store state such as score, position, lane index, or counters.',
          'Use clear names to make your challenge strategy easy to debug.',
        ],
        code: { fileName: profile.fileName, content: profile.snippets.variables },
      },
      'Input / Output': {
        title: `${profile.name} input and output`,
        paragraphs: [
          'Challenge engines provide input through stdin.',
          'Output should contain only valid response lines, no extra text.',
        ],
        code: { fileName: profile.fileName, content: profile.snippets.io },
      },
      Conditions: {
        title: `${profile.name} conditions`,
        paragraphs: [
          'Use conditions to choose moves, validate states, and handle edge cases.',
          'Prefer explicit if/else branches when challenge rules are strict.',
        ],
        code: { fileName: profile.fileName, content: profile.snippets.conditions },
      },
      Loops: {
        title: `${profile.name} loops`,
        paragraphs: [
          'Loops are essential for processing turns, rows, and repeated game steps.',
          'Use loop bounds from input values to avoid out-of-range logic.',
        ],
        code: { fileName: profile.fileName, content: profile.snippets.loops },
      },
      Functions: {
        title: `${profile.name} functions`,
        paragraphs: [
          'Functions keep your solver clean and reusable.',
          'Extract lane selection, path evaluation, or score calculations into helpers.',
        ],
        code: { fileName: profile.fileName, content: profile.snippets.functions },
      },
      'Arrays / Lists': {
        title: `${profile.name} arrays and lists`,
        paragraphs: [
          'Use arrays/lists to keep board rows, moves, or cumulative scores.',
          'Index carefully and keep data aligned with challenge turn numbers.',
        ],
        code: { fileName: profile.fileName, content: profile.snippets.arrays },
      },
      'Example code': {
        title: `${profile.name} challenge example`,
        paragraphs: [
          'This compact example reads challenge steps and prints valid lane moves.',
          'Adapt the decision logic to your real strategy.',
        ],
        code: { fileName: profile.fileName, content: profile.snippets.example },
      },
      'Tips for Arena / Challenge solving': buildTipsSection(profile),
    },
  };
}

export const LANGUAGE_COURSES = Object.fromEntries(
  LANGUAGE_ORDER.map((slug) => [slug, buildCourse(LANGUAGE_PROFILES[slug])])
);

export function getCourseBySlug(slug) {
  if (!slug) return null;
  const key = String(slug).trim().toLowerCase();
  return LANGUAGE_COURSES[key] || null;
}

export function getAllCourses() {
  return LANGUAGE_ORDER.map((slug) => LANGUAGE_COURSES[slug]);
}
