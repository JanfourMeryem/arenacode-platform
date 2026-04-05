/* ═══════════════════════════════════════════════════════════
   AlgoArena — CompletionProvider
   Language-aware autocompletion for Monaco Editor.
   Registers providers for Python, Java, C, C++, C#, PHP.

   Features:
   - Sorted priorities (snippets > builtins > classes > keywords)
   - Trigger characters for dot/colon/hash contexts
   - Smart prefix filtering (System.out. → only System.out.* items)
   - Context detection (suppressed in strings & comments)
   - Deduplicated C++ items (no double entries from C spread)
   - Fixed snippet syntax (C# interpolation, PHP escapes)
   ═══════════════════════════════════════════════════════════ */

/* ─── Lazy-initialised Monaco constants ─────────────────── */
let Kind, Insert;

/* ─── Sort-order prefixes (lower = higher priority) ─────── */
const SORT = { snippet: '0', builtin: '1', class_: '2', keyword: '3' };

/* ─── Deduplication helper ──────────────────────────────── */
function dedup(arr) {
  const seen = new Set();
  return arr.filter(item => {
    const label = Array.isArray(item) ? item[0] : item;
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

/* ─── Item builders ─────────────────────────────────────── */
function item(label, kind, sortPrefix, insertText, detail) {
  const text = insertText || label;
  const isSnippet = text.includes('$');
  return {
    label,
    kind,
    insertText: text,
    insertTextRules: isSnippet ? Insert : undefined,
    detail: detail || '',
    sortText: sortPrefix + label.toLowerCase().replace(/[^a-z0-9]/g, ''),
  };
}

function kw(label)                   { return item(label, Kind.Keyword,  SORT.keyword, undefined, 'keyword'); }
function fn(label, insert, detail)   { return item(label, Kind.Function, SORT.builtin, insert, detail || 'built-in'); }
function snip(label, insert, detail) { return item(label, Kind.Snippet,  SORT.snippet, insert, detail || 'snippet'); }
function cls(label)                  { return item(label, Kind.Class,    SORT.class_,  undefined, 'class'); }

/* ═══════════════════════════════════════════════════════════
   Language Definitions
   ═══════════════════════════════════════════════════════════ */

/* ─── Python ────────────────────────────────────────────── */
const PYTHON = {
  keywords: [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
    'try', 'while', 'with', 'yield',
  ],
  builtins: [
    ['print',      'print(${1:value})',                          'Print to stdout'],
    ['input',      'input(${1:prompt})',                         'Read from stdin'],
    ['len',        'len(${1:obj})',                              'Return length'],
    ['range',      'range(${1:stop})',                           'Generate range'],
    ['int',        'int(${1:value})',                            'Convert to int'],
    ['str',        'str(${1:value})',                            'Convert to string'],
    ['float',      'float(${1:value})',                          'Convert to float'],
    ['bool',       'bool(${1:value})',                           'Convert to bool'],
    ['list',       'list(${1:iterable})',                        'Create list'],
    ['dict',       'dict(${1})',                                 'Create dictionary'],
    ['set',        'set(${1:iterable})',                         'Create set'],
    ['tuple',      'tuple(${1:iterable})',                       'Create tuple'],
    ['type',       'type(${1:obj})',                             'Get type'],
    ['isinstance', 'isinstance(${1:obj}, ${2:classinfo})',       'Check instance'],
    ['enumerate',  'enumerate(${1:iterable})',                   'Enumerate with index'],
    ['zip',        'zip(${1:iter1}, ${2:iter2})',                'Zip iterables'],
    ['map',        'map(${1:func}, ${2:iterable})',              'Apply function'],
    ['filter',     'filter(${1:func}, ${2:iterable})',           'Filter iterable'],
    ['sorted',     'sorted(${1:iterable})',                      'Return sorted list'],
    ['reversed',   'reversed(${1:seq})',                         'Return reversed iterator'],
    ['abs',        'abs(${1:x})',                                'Absolute value'],
    ['min',        'min(${1:iterable})',                         'Minimum value'],
    ['max',        'max(${1:iterable})',                         'Maximum value'],
    ['sum',        'sum(${1:iterable})',                         'Sum of iterable'],
    ['round',      'round(${1:number}, ${2:ndigits})',           'Round number'],
    ['open',       'open(${1:file}, ${2:mode})',                 'Open file'],
    ['hasattr',    'hasattr(${1:obj}, ${2:name})',               'Check attribute'],
    ['getattr',    'getattr(${1:obj}, ${2:name})',               'Get attribute'],
    ['setattr',    'setattr(${1:obj}, ${2:name}, ${3:value})',   'Set attribute'],
    ['super',      'super()',                                    'Parent class reference'],
    ['ord',        'ord(${1:char})',                             'Unicode code point'],
    ['chr',        'chr(${1:code})',                             'Character from code point'],
    ['hex',        'hex(${1:number})',                           'Convert to hex string'],
    ['bin',        'bin(${1:number})',                           'Convert to binary string'],
    ['any',        'any(${1:iterable})',                         'True if any element is true'],
    ['all',        'all(${1:iterable})',                         'True if all elements are true'],
    ['id',         'id(${1:obj})',                               'Object identity'],
    ['repr',       'repr(${1:obj})',                             'Printable representation'],
    ['format',     'format(${1:value}, ${2:spec})',              'Format a value'],
  ],
  snippets: [
    ['def function',  'def ${1:name}(${2:params}):\n\t${3:pass}',                                          'Function definition'],
    ['class',         'class ${1:Name}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}',                'Class definition'],
    ['if/else',       'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}',                                'If-else block'],
    ['for loop',      'for ${1:item} in ${2:iterable}:\n\t${3:pass}',                                      'For loop'],
    ['while loop',    'while ${1:condition}:\n\t${2:pass}',                                                 'While loop'],
    ['try/except',    'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}',                   'Try-except block'],
    ['with open',     'with open(${1:file}, "${2:r}") as ${3:f}:\n\t${4:pass}',                             'File context manager'],
    ['list comp',     '[${1:expr} for ${2:item} in ${3:iterable}]',                                         'List comprehension'],
    ['dict comp',     '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}',                              'Dict comprehension'],
    ['lambda',        'lambda ${1:x}: ${2:expr}',                                                          'Lambda expression'],
    ['if __name__',   'if __name__ == "__main__":\n\t${1:main()}',                                          'Main guard'],
    ['@property',     '@property\ndef ${1:name}(self):\n\treturn self._${1:name}',                          'Property decorator'],
    ['@staticmethod', '@staticmethod\ndef ${1:name}(${2:params}):\n\t${3:pass}',                            'Static method'],
    ['@classmethod',  '@classmethod\ndef ${1:name}(cls${2:, params}):\n\t${3:pass}',                        'Class method'],
    ['docstring',     '"""${1:Summary}\n\n${2:Description}\n"""',                                           'Docstring block'],
  ],
};

/* ─── Java ──────────────────────────────────────────────── */
const JAVA = {
  keywords: [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch',
    'char', 'class', 'const', 'continue', 'default', 'do', 'double',
    'else', 'enum', 'extends', 'final', 'finally', 'float', 'for',
    'goto', 'if', 'implements', 'import', 'instanceof', 'int',
    'interface', 'long', 'native', 'new', 'package', 'private',
    'protected', 'public', 'return', 'short', 'static', 'strictfp',
    'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
    'transient', 'try', 'void', 'volatile', 'while',
  ],
  builtins: [
    ['System.out.println',  'System.out.println(${1:value});',   'Print to stdout'],
    ['System.out.print',    'System.out.print(${1:value});',     'Print without newline'],
    ['System.err.println',  'System.err.println(${1:value});',   'Print to stderr'],
    ['Integer.parseInt',    'Integer.parseInt(${1:str})',        'Parse string to int'],
    ['Double.parseDouble',  'Double.parseDouble(${1:str})',      'Parse string to double'],
    ['String.valueOf',      'String.valueOf(${1:value})',        'Convert to string'],
    ['Math.abs',            'Math.abs(${1:x})',                  'Absolute value'],
    ['Math.max',            'Math.max(${1:a}, ${2:b})',          'Maximum of two values'],
    ['Math.min',            'Math.min(${1:a}, ${2:b})',          'Minimum of two values'],
    ['Math.sqrt',           'Math.sqrt(${1:x})',                 'Square root'],
    ['Math.pow',            'Math.pow(${1:base}, ${2:exp})',     'Power'],
    ['Math.random',         'Math.random()',                     'Random [0,1)'],
    ['Arrays.sort',         'Arrays.sort(${1:array});',          'Sort array'],
    ['Arrays.toString',     'Arrays.toString(${1:array})',       'Array to string'],
    ['Collections.sort',    'Collections.sort(${1:list});',      'Sort list'],
  ],
  classes: [
    'String', 'Integer', 'Double', 'Float', 'Long', 'Boolean', 'Character',
    'Object', 'System', 'Math', 'Arrays', 'Collections',
    'ArrayList', 'LinkedList', 'HashMap', 'HashSet', 'TreeMap', 'TreeSet',
    'Scanner', 'StringBuilder', 'StringBuffer',
    'Exception', 'RuntimeException', 'IOException',
    'Thread', 'Runnable', 'Comparable', 'Iterable', 'Iterator',
    'List', 'Map', 'Set', 'Queue', 'Stack', 'Deque',
    'Stream', 'Optional', 'Consumer', 'Function', 'Predicate', 'Supplier',
  ],
  snippets: [
    ['main method',    'public static void main(String[] args) {\n\t${1}\n}',                                'Main method'],
    ['public class',   'public class ${1:Name} {\n\t${2}\n}',                                                'Public class'],
    ['for loop',       'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}',                       'For loop'],
    ['for-each',       'for (${1:Type} ${2:item} : ${3:collection}) {\n\t${4}\n}',                            'Enhanced for loop'],
    ['while loop',     'while (${1:condition}) {\n\t${2}\n}',                                                 'While loop'],
    ['if/else',        'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}',                                  'If-else block'],
    ['try/catch',      'try {\n\t${1}\n} catch (${2:Exception} ${3:e}) {\n\t${4:e.printStackTrace();}\n}',    'Try-catch block'],
    ['switch',         'switch (${1:expr}) {\n\tcase ${2:value}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\t${4}\n}', 'Switch statement'],
    ['sout',           'System.out.println(${1});',                                                           'Print line (sout)'],
    ['new ArrayList',  'ArrayList<${1:Type}> ${2:list} = new ArrayList<>();',                                 'New ArrayList'],
    ['new HashMap',    'HashMap<${1:Key}, ${2:Value}> ${3:map} = new HashMap<>();',                           'New HashMap'],
    ['Scanner',        'Scanner ${1:sc} = new Scanner(System.in);',                                           'New Scanner'],
    ['method',         'public ${1:void} ${2:name}(${3:params}) {\n\t${4}\n}',                                'Method definition'],
    ['@Override',      '@Override\npublic ${1:void} ${2:methodName}(${3}) {\n\t${4}\n}',                      'Override method'],
    ['interface',      'public interface ${1:Name} {\n\t${2}\n}',                                             'Interface definition'],
    ['import',         'import ${1:java.util.*};',                                                            'Import statement'],
  ],
};

/* ─── C ─────────────────────────────────────────────────── */
const C_LANG = {
  keywords: [
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default',
    'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto',
    'if', 'inline', 'int', 'long', 'register', 'restrict', 'return',
    'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef',
    'union', 'unsigned', 'void', 'volatile', 'while',
    '_Bool', '_Complex', '_Imaginary',
    'NULL', 'true', 'false',
  ],
  builtins: [
    ['printf',   'printf("${1:%s}\\n"${2:, arg});',              'Formatted output'],
    ['scanf',    'scanf("${1:%d}", &${2:var});',                  'Formatted input'],
    ['fprintf',  'fprintf(${1:stderr}, "${2:%s}\\n"${3:, arg});', 'File formatted output'],
    ['sprintf',  'sprintf(${1:buf}, "${2:%s}"${3:, arg});',       'String formatted output'],
    ['malloc',   'malloc(${1:size} * sizeof(${2:type}))',         'Allocate memory'],
    ['calloc',   'calloc(${1:count}, sizeof(${2:type}))',         'Allocate zeroed memory'],
    ['realloc',  'realloc(${1:ptr}, ${2:size})',                  'Reallocate memory'],
    ['free',     'free(${1:ptr});',                               'Free memory'],
    ['strlen',   'strlen(${1:str})',                              'String length'],
    ['strcmp',    'strcmp(${1:s1}, ${2:s2})',                      'Compare strings'],
    ['strcpy',   'strcpy(${1:dest}, ${2:src})',                   'Copy string'],
    ['strcat',   'strcat(${1:dest}, ${2:src})',                   'Concatenate strings'],
    ['memcpy',   'memcpy(${1:dest}, ${2:src}, ${3:n})',           'Copy memory'],
    ['memset',   'memset(${1:ptr}, ${2:value}, ${3:n})',          'Fill memory'],
    ['atoi',     'atoi(${1:str})',                                'String to int'],
    ['atof',     'atof(${1:str})',                                'String to float'],
    ['abs',      'abs(${1:x})',                                   'Absolute value'],
    ['exit',     'exit(${1:0});',                                 'Exit program'],
    ['fopen',    'fopen("${1:file}", "${2:r}")',                  'Open file'],
    ['fclose',   'fclose(${1:fp});',                              'Close file'],
    ['fgets',    'fgets(${1:buf}, ${2:size}, ${3:fp})',           'Read line from file'],
    ['puts',     'puts(${1:str});',                               'Print string + newline'],
    ['getchar',  'getchar()',                                     'Read character from stdin'],
    ['putchar',  'putchar(${1:c});',                              'Write character to stdout'],
  ],
  snippets: [
    ['#include <stdio.h>',   '#include <stdio.h>',                                                'Standard I/O'],
    ['#include <stdlib.h>',  '#include <stdlib.h>',                                                'Standard Library'],
    ['#include <string.h>',  '#include <string.h>',                                                'String operations'],
    ['#include <math.h>',    '#include <math.h>',                                                  'Math functions'],
    ['#include <stdbool.h>', '#include <stdbool.h>',                                               'Boolean type'],
    ['#define',              '#define ${1:NAME} ${2:value}',                                        'Macro definition'],
    ['main function',        'int main(int argc, char *argv[]) {\n\t${1}\n\treturn 0;\n}',         'Main function'],
    ['main (simple)',        'int main() {\n\t${1}\n\treturn 0;\n}',                                'Simple main'],
    ['for loop',             'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}',       'For loop'],
    ['while loop',           'while (${1:condition}) {\n\t${2}\n}',                                 'While loop'],
    ['if/else',              'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}',                  'If-else block'],
    ['struct',               'typedef struct {\n\t${1:int member;}\n} ${2:Name};',                   'Typedef struct'],
    ['switch',               'switch (${1:expr}) {\n\tcase ${2:val}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\t${4}\n}', 'Switch statement'],
    ['do while',             'do {\n\t${1}\n} while (${2:condition});',                              'Do-while loop'],
    ['header guard',         '#ifndef ${1:HEADER_H}\n#define ${1:HEADER_H}\n\n${2}\n\n#endif',      'Header guard'],
  ],
};

/* ─── C++ (clean merge of C + C++ specific, deduplicated) ─ */
const _CPP_ONLY_KEYWORDS = [
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'bitand', 'bitor',
  'bool', 'catch', 'char8_t', 'char16_t', 'char32_t', 'class',
  'co_await', 'co_return', 'co_yield', 'compl', 'concept', 'consteval',
  'constexpr', 'constinit', 'const_cast', 'decltype', 'delete',
  'dynamic_cast', 'explicit', 'export', 'friend',
  'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq',
  'nullptr', 'operator', 'or', 'or_eq', 'override', 'private',
  'protected', 'public', 'reinterpret_cast', 'requires', 'static_assert',
  'static_cast', 'template', 'this', 'throw', 'try',
  'typeid', 'typename', 'using', 'virtual', 'wchar_t', 'xor', 'xor_eq',
];

const _CPP_ONLY_BUILTINS = [
  ['std::cout',        'std::cout << ${1:value} << std::endl;',  'Print to stdout'],
  ['std::cin',         'std::cin >> ${1:var};',                  'Read from stdin'],
  ['std::cerr',        'std::cerr << ${1:value} << std::endl;',  'Print to stderr'],
  ['std::getline',     'std::getline(std::cin, ${1:str});',      'Read full line'],
  ['std::sort',        'std::sort(${1:begin}, ${2:end});',       'Sort range'],
  ['std::find',        'std::find(${1:begin}, ${2:end}, ${3:value})', 'Find element'],
  ['std::swap',        'std::swap(${1:a}, ${2:b});',             'Swap values'],
  ['std::max',         'std::max(${1:a}, ${2:b})',               'Maximum'],
  ['std::min',         'std::min(${1:a}, ${2:b})',               'Minimum'],
  ['std::abs',         'std::abs(${1:x})',                       'Absolute value'],
  ['std::to_string',   'std::to_string(${1:value})',             'Number to string'],
  ['std::stoi',        'std::stoi(${1:str})',                    'String to int'],
  ['std::stod',        'std::stod(${1:str})',                    'String to double'],
  ['std::make_pair',   'std::make_pair(${1:first}, ${2:second})', 'Make pair'],
  ['std::make_unique', 'std::make_unique<${1:T}>(${2:args})',    'Make unique_ptr'],
  ['std::make_shared', 'std::make_shared<${1:T}>(${2:args})',    'Make shared_ptr'],
];

const _CPP_ONLY_SNIPPETS = [
  ['#include <iostream>',      '#include <iostream>',      'I/O stream'],
  ['#include <vector>',        '#include <vector>',        'Vector container'],
  ['#include <string>',        '#include <string>',        'String class'],
  ['#include <algorithm>',     '#include <algorithm>',     'Algorithms'],
  ['#include <map>',           '#include <map>',           'Map container'],
  ['#include <set>',           '#include <set>',           'Set container'],
  ['#include <cmath>',         '#include <cmath>',         'Math functions'],
  ['#include <memory>',        '#include <memory>',        'Smart pointers'],
  ['#include <functional>',    '#include <functional>',    'Function objects'],
  ['#include <bits/stdc++.h>', '#include <bits/stdc++.h>', 'All headers (competitive)'],
  ['using namespace std',      'using namespace std;',     'Use std namespace'],
  ['class',      'class ${1:Name} {\npublic:\n\t${1:Name}() {${2}}\n\t~${1:Name}() {}\nprivate:\n\t${3}\n};', 'Class definition'],
  ['vector',     'std::vector<${1:int}> ${2:vec};',                                                            'Declare vector'],
  ['range for',  'for (auto& ${1:item} : ${2:container}) {\n\t${3}\n}',                                        'Range-based for loop'],
  ['auto lambda','auto ${1:fn} = [${2:&}](${3:params}) {\n\t${4}\n};',                                         'Lambda expression'],
  ['try/catch',  'try {\n\t${1}\n} catch (const std::exception& ${2:e}) {\n\tstd::cerr << ${2:e}.what() << std::endl;\n}', 'Try-catch block'],
  ['template',   'template <typename ${1:T}>\n${2:T} ${3:func}(${4:params}) {\n\t${5}\n}',                      'Function template'],
];

const CPP = {
  /* Deduplicated merge of C + C++ keywords */
  keywords: [...new Set([...C_LANG.keywords, ..._CPP_ONLY_KEYWORDS])],
  /* Deduplicated merge of C + C++ builtins */
  builtins: dedup([...C_LANG.builtins, ..._CPP_ONLY_BUILTINS]),
  classes: [
    'string', 'vector', 'map', 'unordered_map', 'set', 'unordered_set',
    'list', 'deque', 'queue', 'stack', 'priority_queue', 'pair',
    'array', 'bitset', 'tuple', 'optional', 'variant', 'any',
    'unique_ptr', 'shared_ptr', 'weak_ptr',
    'stringstream', 'istringstream', 'ostringstream',
    'ifstream', 'ofstream', 'fstream',
    'thread', 'mutex', 'condition_variable', 'future', 'promise',
    'regex', 'smatch', 'sregex_iterator',
    'exception', 'runtime_error', 'logic_error', 'invalid_argument',
  ],
  /* C snippets (minus C includes/define — replaced by C++ ones) + C++ specific */
  snippets: dedup([
    ...C_LANG.snippets.filter(s => !s[0].startsWith('#include') && !s[0].startsWith('#define')),
    ..._CPP_ONLY_SNIPPETS,
  ]),
};

/* ─── C# ────────────────────────────────────────────────── */
const CSHARP = {
  keywords: [
    'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch',
    'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default',
    'delegate', 'do', 'double', 'else', 'enum', 'event', 'explicit',
    'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach',
    'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal',
    'is', 'lock', 'long', 'namespace', 'new', 'null', 'object',
    'operator', 'out', 'override', 'params', 'private', 'protected',
    'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short',
    'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
    'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong',
    'unchecked', 'unsafe', 'ushort', 'using', 'var', 'virtual',
    'void', 'volatile', 'while',
    'async', 'await', 'dynamic', 'nameof', 'record', 'init',
    'required', 'yield', 'when', 'where',
  ],
  builtins: [
    ['Console.WriteLine',      'Console.WriteLine(${1:value});',                'Print to stdout'],
    ['Console.Write',          'Console.Write(${1:value});',                    'Print without newline'],
    ['Console.ReadLine',       'Console.ReadLine()',                             'Read line from stdin'],
    ['Console.ReadKey',        'Console.ReadKey()',                              'Read key from stdin'],
    ['int.Parse',              'int.Parse(${1:str})',                            'Parse string to int'],
    ['int.TryParse',           'int.TryParse(${1:str}, out ${2:result})',        'Safe parse to int'],
    ['Convert.ToInt32',        'Convert.ToInt32(${1:value})',                    'Convert to int'],
    ['Convert.ToString',       'Convert.ToString(${1:value})',                   'Convert to string'],
    ['Math.Abs',               'Math.Abs(${1:x})',                              'Absolute value'],
    ['Math.Max',               'Math.Max(${1:a}, ${2:b})',                      'Maximum'],
    ['Math.Min',               'Math.Min(${1:a}, ${2:b})',                      'Minimum'],
    ['Math.Sqrt',              'Math.Sqrt(${1:x})',                             'Square root'],
    ['Math.Pow',               'Math.Pow(${1:base}, ${2:exp})',                 'Power'],
    ['String.IsNullOrEmpty',   'String.IsNullOrEmpty(${1:str})',                'Check null/empty'],
    ['String.Join',            'String.Join(${1:sep}, ${2:values})',             'Join strings'],
    ['String.Format',          'String.Format("${1}", ${2})',                    'Format string'],
  ],
  classes: [
    'Console', 'Math', 'Convert', 'String', 'Object', 'Exception',
    'List', 'Dictionary', 'HashSet', 'Queue', 'Stack', 'SortedList',
    'StringBuilder', 'DateTime', 'TimeSpan', 'Random', 'Guid',
    'Task', 'Thread', 'Mutex', 'Semaphore', 'CancellationToken',
    'File', 'StreamReader', 'StreamWriter', 'Path', 'Directory',
    'Regex', 'Match', 'MatchCollection',
    'IEnumerable', 'IList', 'IDictionary', 'IDisposable', 'IComparable',
    'Func', 'Action', 'Predicate', 'EventHandler',
    'Enumerable', 'Queryable',
  ],
  snippets: [
    ['main',                 'static void Main(string[] args)\n{\n\t${1}\n}',                                                  'Main method'],
    ['cw',                   'Console.WriteLine(${1});',                                                                        'Print line (cw)'],
    ['for loop',             'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++)\n{\n\t${3}\n}',                                  'For loop'],
    ['foreach',              'foreach (var ${1:item} in ${2:collection})\n{\n\t${3}\n}',                                         'Foreach loop'],
    ['while',                'while (${1:condition})\n{\n\t${2}\n}',                                                             'While loop'],
    ['if/else',              'if (${1:condition})\n{\n\t${2}\n}\nelse\n{\n\t${3}\n}',                                            'If-else block'],
    ['try/catch',            'try\n{\n\t${1}\n}\ncatch (${2:Exception} ${3:ex})\n{\n\t${4:Console.WriteLine(ex.Message);}\n}',   'Try-catch block'],
    ['switch',               'switch (${1:expr})\n{\n\tcase ${2:val}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\t${4}\n\t\tbreak;\n}', 'Switch statement'],
    ['class',                'public class ${1:Name}\n{\n\t${2}\n}',                                                             'Class definition'],
    ['property',             'public ${1:string} ${2:Name} { get; set; }',                                                       'Auto-property'],
    ['method',               'public ${1:void} ${2:Name}(${3})\n{\n\t${4}\n}',                                                   'Method definition'],
    ['async method',         'public async Task${1:<T>} ${2:Name}(${3})\n{\n\t${4}\n}',                                          'Async method'],
    ['using statement',      'using (var ${1:obj} = ${2:new Resource()})\n{\n\t${3}\n}',                                          'Using statement'],
    ['new List',             'var ${1:list} = new List<${2:string}>();',                                                          'New List'],
    ['new Dictionary',       'var ${1:dict} = new Dictionary<${2:string}, ${3:int}>();',                                          'New Dictionary'],
    ['LINQ',                 '${1:collection}.Where(${2:x} => ${3:condition}).ToList()',                                          'LINQ query'],
    ['string interpolation', '\\$"{${1:expression}}"',                                                                           'Interpolated string ($"...")'],
    ['using System',         'using System;',                                                                                     'Using System'],
    ['using Collections',    'using System.Collections.Generic;',                                                                 'Using Generic Collections'],
    ['using Linq',           'using System.Linq;',                                                                                'Using LINQ'],
    ['namespace',            'namespace ${1:MyNamespace}\n{\n\t${2}\n}',                                                          'Namespace declaration'],
  ],
};

/* ─── PHP (deduplicated: echo/isset/empty only in builtins) */
const PHP = {
  keywords: [
    'abstract', 'and', 'array', 'as', 'break', 'callable', 'case',
    'catch', 'class', 'clone', 'const', 'continue', 'declare', 'default',
    'die', 'do', 'else', 'elseif', 'enddeclare',
    'endfor', 'endforeach', 'endif', 'endswitch', 'endwhile', 'eval',
    'exit', 'extends', 'final', 'finally', 'fn', 'for', 'foreach',
    'function', 'global', 'goto', 'if', 'implements', 'include',
    'include_once', 'instanceof', 'insteadof', 'interface',
    'list', 'match', 'namespace', 'new', 'or', 'print', 'private',
    'protected', 'public', 'readonly', 'require', 'require_once',
    'return', 'static', 'switch', 'throw', 'trait', 'try', 'unset',
    'use', 'var', 'while', 'xor', 'yield',
    'true', 'false', 'null', 'self', 'parent',
    'int', 'float', 'string', 'bool', 'void', 'mixed', 'never',
  ],
  builtins: [
    ['echo',               'echo ${1:value};',                                      'Output string'],
    ['isset',              'isset(${1:var})',                                        'Check if set'],
    ['empty',              'empty(${1:var})',                                        'Check if empty'],
    ['print_r',            'print_r(${1:value});',                                  'Print readable'],
    ['var_dump',           'var_dump(${1:value});',                                  'Dump variable'],
    ['strlen',             'strlen(${1:str})',                                       'String length'],
    ['substr',             'substr(${1:str}, ${2:start}, ${3:length})',              'Substring'],
    ['strpos',             'strpos(${1:haystack}, ${2:needle})',                     'Find position'],
    ['str_replace',        'str_replace(${1:search}, ${2:replace}, ${3:subject})',   'Replace string'],
    ['strtolower',         'strtolower(${1:str})',                                   'Lowercase'],
    ['strtoupper',         'strtoupper(${1:str})',                                   'Uppercase'],
    ['trim',               'trim(${1:str})',                                         'Trim whitespace'],
    ['explode',            'explode("${1:,}", ${2:str})',                            'Split string'],
    ['implode',            'implode("${1:,}", ${2:array})',                          'Join array'],
    ['count',              'count(${1:array})',                                      'Count elements'],
    ['array_push',         'array_push(${1:array}, ${2:value});',                    'Push to array'],
    ['array_pop',          'array_pop(${1:array})',                                  'Pop from array'],
    ['array_merge',        'array_merge(${1:arr1}, ${2:arr2})',                      'Merge arrays'],
    ['array_map',          'array_map(fn(${1:\\$x}) => ${2:expr}, ${3:\\$arr})',      'Map array'],
    ['array_filter',       'array_filter(${1:\\$arr}, fn(${2:\\$x}) => ${3:condition})', 'Filter array'],
    ['in_array',           'in_array(${1:value}, ${2:array})',                       'Check if in array'],
    ['array_key_exists',   'array_key_exists("${1:key}", ${2:array})',               'Check key exists'],
    ['sort',               'sort(${1:array});',                                      'Sort array'],
    ['json_encode',        'json_encode(${1:value})',                                'Encode to JSON'],
    ['json_decode',        'json_decode(${1:json}, true)',                            'Decode JSON'],
    ['intval',             'intval(${1:value})',                                     'Convert to int'],
    ['floatval',           'floatval(${1:value})',                                   'Convert to float'],
    ['is_array',           'is_array(${1:value})',                                   'Check if array'],
    ['is_string',          'is_string(${1:value})',                                  'Check if string'],
    ['is_numeric',         'is_numeric(${1:value})',                                 'Check if numeric'],
    ['date',               'date("${1:Y-m-d H:i:s}")',                               'Format date'],
    ['time',               'time()',                                                 'Current timestamp'],
    ['file_get_contents',  'file_get_contents("${1:path}")',                          'Read file'],
    ['file_put_contents',  'file_put_contents("${1:path}", ${2:data});',              'Write file'],
  ],
  snippets: [
    ['<?php',      '<?php\n${1}\n',                                                                    'PHP opening tag'],
    ['function',   'function ${1:name}(${2:params}): ${3:void} {\n\t${4}\n}',                          'Function definition'],
    ['class',      'class ${1:Name} {\n\tpublic function __construct(${2}) {\n\t\t${3}\n\t}\n}',       'Class definition'],
    ['if/else',    'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}',                               'If-else block'],
    ['foreach',    'foreach (${1:\\$array} as ${2:\\$key} => ${3:\\$value}) {\n\t${4}\n}',              'Foreach loop'],
    ['for loop',   'for (${1:\\$i} = 0; ${1:\\$i} < ${2:\\$n}; ${1:\\$i}++) {\n\t${3}\n}',             'For loop'],
    ['while loop', 'while (${1:condition}) {\n\t${2}\n}',                                              'While loop'],
    ['try/catch',  'try {\n\t${1}\n} catch (\\Exception ${2:\\$e}) {\n\t${3:echo \\$e->getMessage();}\n}', 'Try-catch block'],
    ['switch',     'switch (${1:\\$expr}) {\n\tcase ${2:value}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\t${4}\n}', 'Switch statement'],
    ['method',     'public function ${1:name}(${2}): ${3:void} {\n\t${4}\n}',                          'Class method'],
    ['arrow fn',   'fn(${1:\\$x}) => ${2:expr}',                                                       'Arrow function'],
    ['match',      'match(${1:\\$value}) {\n\t${2:pattern} => ${3:result},\n\tdefault => ${4:fallback},\n}', 'Match expression'],
  ],
};

/* ═══════════════════════════════════════════════════════════
   Context Detection — suppress in strings/comments
   ═══════════════════════════════════════════════════════════ */

function isInStringOrComment(model, position) {
  try {
    const lineContent = model.getLineContent(position.lineNumber);
    const langId = model.getLanguageId();
    const tokens = monaco.editor.tokenize(lineContent, langId);
    if (!tokens?.[0]?.length) return false;

    let tokenType = '';
    for (const token of tokens[0]) {
      if (token.offset >= position.column - 1) break;
      tokenType = token.type;
    }
    return /string|comment/.test(tokenType);
  } catch {
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════
   Suggestion Builder
   ═══════════════════════════════════════════════════════════ */

function buildSuggestions(lang, range) {
  const suggestions = [];
  for (const k of (lang.keywords || []))
    suggestions.push({ ...kw(k), range });
  for (const [label, insert, detail] of (lang.builtins || []))
    suggestions.push({ ...fn(label, insert, detail), range });
  for (const [label, insert, detail] of (lang.snippets || []))
    suggestions.push({ ...snip(label, insert, detail), range });
  for (const c of (lang.classes || []))
    suggestions.push({ ...cls(c), range });
  return suggestions;
}

/* ═══════════════════════════════════════════════════════════
   Smart Provider Registration
   ═══════════════════════════════════════════════════════════ */

function registerProvider(languageId, langDef, triggerCharacters = []) {
  monaco.languages.registerCompletionItemProvider(languageId, {
    triggerCharacters,

    provideCompletionItems(model, position) {
      /* ── Suppress completions in strings & comments ───── */
      if (isInStringOrComment(model, position)) {
        return { suggestions: [] };
      }

      const line = model.getLineContent(position.lineNumber);
      const textBefore = line.substring(0, position.column - 1);
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const all = buildSuggestions(langDef, range);

      /* ── Dot-prefix context (Java: System.out. / C#: Console.) */
      const dotMatch = textBefore.match(/([\w]+(?:\.[\w]+)*)\.\s*$/);
      if (dotMatch) {
        const prefix = dotMatch[1] + '.';
        const startCol = position.column - dotMatch[0].length;
        const filtered = all.filter(s =>
          typeof s.label === 'string' && s.label.startsWith(prefix)
        );
        if (filtered.length) {
          const adjustedRange = { ...range, startColumn: startCol };
          return { suggestions: filtered.map(s => ({ ...s, range: adjustedRange })) };
        }
      }

      /* ── Double-colon prefix context (C++: std::) ─────── */
      const colonMatch = textBefore.match(/([\w]+)::\s*$/);
      if (colonMatch) {
        const prefix = colonMatch[1] + '::';
        const startCol = position.column - colonMatch[0].length;
        const filtered = all.filter(s =>
          typeof s.label === 'string' && s.label.startsWith(prefix)
        );
        if (filtered.length) {
          const adjustedRange = { ...range, startColumn: startCol };
          return { suggestions: filtered.map(s => ({ ...s, range: adjustedRange })) };
        }
      }

      /* ── Hash prefix context (C/C++: #include) ──────── */
      const trimmedBefore = textBefore.trimStart();
      if (/^#\w*$/.test(trimmedBefore)) {
        const hashCol = textBefore.indexOf('#') + 1; // 1-based
        const adjustedRange = { ...range, startColumn: hashCol };
        const filtered = all.filter(s =>
          typeof s.label === 'string' && s.label.startsWith('#')
        );
        if (filtered.length) {
          return { suggestions: filtered.map(s => ({ ...s, range: adjustedRange })) };
        }
      }

      /* ── Default: return all suggestions ─────────────── */
      return { suggestions: all };
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   Public Bootstrap
   ═══════════════════════════════════════════════════════════ */

export function registerAllCompletionProviders() {
  /* Resolve Monaco constants lazily (safe after AMD load) */
  Kind   = monaco.languages.CompletionItemKind;
  Insert = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

  registerProvider('python',  PYTHON);
  registerProvider('java',    JAVA,    ['.']);
  registerProvider('c',       C_LANG,  ['#']);
  registerProvider('cpp',     CPP,     ['#']);
  registerProvider('csharp',  CSHARP,  ['.']);
  registerProvider('php',     PHP);
}
