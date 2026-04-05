'use strict';

const INPUT_MARKERS_BY_LANGUAGE = Object.freeze({
  python: [/\binput\s*\(/i],
  javascript: [/\bprocess\.stdin\b/i, /\breadline\b/i, /\bfs\.readFileSync\s*\(/i],
  typescript: [/\bprocess\.stdin\b/i, /\breadline\b/i, /\bfs\.readFileSync\s*\(/i],
  java: [/\bScanner\b/i, /\bBufferedReader\b/i, /\breadLine\s*\(/i],
  c: [/\bscanf\s*\(/i, /\bfgets\s*\(/i, /\bgetchar\s*\(/i],
  cpp: [/\bcin\b/i, /\bgetline\s*\(/i, /\bscanf\s*\(/i],
  csharp: [/\bConsole\.ReadLine\s*\(/i],
  php: [/\bfgets\s*\(\s*STDIN\s*\)/i],
  go: [/\bfmt\.Scan/i, /\bbufio\.NewReader\s*\(/i],
  ruby: [/\bgets\b/i, /\bSTDIN\b/i],
});

const OUTPUT_MARKERS_BY_LANGUAGE = Object.freeze({
  python: [/\bprint\s*\(/i],
  javascript: [/\bconsole\.log\s*\(/i, /\bprocess\.stdout\.write\s*\(/i],
  typescript: [/\bconsole\.log\s*\(/i, /\bprocess\.stdout\.write\s*\(/i],
  java: [/\bSystem\.out\.print/i],
  c: [/\bprintf\s*\(/i, /\bputs\s*\(/i],
  cpp: [/\bcout\b/i, /\bprintf\s*\(/i],
  csharp: [/\bConsole\.Write/i],
  php: [/\becho\b/i, /\bprint\s*\(/i, /\bfwrite\s*\(\s*STDOUT/i],
  go: [/\bfmt\.Print/i],
  ruby: [/\bputs\b/i, /\bprint\b/i],
});

const CONTROL_FLOW_MARKERS = Object.freeze([
  /\bif\b/i,
  /\belse\b/i,
  /\bfor\b/i,
  /\bwhile\b/i,
  /\bswitch\b/i,
  /\bcase\b/i,
  /\bforeach\b/i,
  /\bdo\b/i,
  /\bdef\b/i,
  /\bfunction\b/i,
  /\blambda\b/i,
  /\breturn\b/i,
]);

const OUTPUT_LITERAL_LINE_PATTERNS = Object.freeze([
  /^\s*print\s*\(\s*["']?[1-4]["']?\s*\)\s*;?\s*$/i,
  /^\s*console\.log\s*\(\s*["']?[1-4]["']?\s*\)\s*;?\s*$/i,
  /^\s*System\.out\.println?\s*\(\s*["']?[1-4]["']?\s*\)\s*;?\s*$/i,
  /^\s*printf\s*\(\s*["']?[1-4]\\?n?["']?\s*\)\s*;?\s*$/i,
  /^\s*echo\s+["']?[1-4]["']?\s*;?\s*$/i,
  /^\s*puts\s+["']?[1-4]["']?\s*;?\s*$/i,
  /^\s*Console\.WriteLine?\s*\(\s*["']?[1-4]["']?\s*\)\s*;?\s*$/i,
  /^\s*fmt\.Println?\s*\(\s*["']?[1-4]["']?\s*\)\s*;?\s*$/i,
]);

function getSubmissionText(files, entryFile) {
  if (!Array.isArray(files) || !files.length) return '';
  const ordered = [];
  const seen = new Set();

  if (typeof entryFile === 'string' && entryFile.trim()) {
    const entry = files.find((f) => f && f.name === entryFile);
    if (entry) {
      ordered.push(entry);
      seen.add(entry.name);
    }
  }

  for (const file of files) {
    if (!file || typeof file.name !== 'string' || seen.has(file.name)) continue;
    ordered.push(file);
    seen.add(file.name);
  }

  return ordered
    .map((file) => (typeof file.content === 'string' ? file.content : ''))
    .join('\n');
}

function getSignificantLines(source) {
  return String(source || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('//'))
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !line.startsWith('/*'))
    .filter((line) => !line.startsWith('*'))
    .filter((line) => !line.startsWith('*/'))
    .filter((line) => !/^[{}();]+$/.test(line));
}

function anyMatch(text, regexList) {
  return regexList.some((regex) => regex.test(text));
}

function analyzeSnakeSubmission({ language, files, entryFile, stdout = '' }) {
  const source = getSubmissionText(files, entryFile);
  const lowerSource = source.toLowerCase();
  const lowerStdout = String(stdout || '').toLowerCase();
  const significantLines = getSignificantLines(source);

  const inputMarkers = INPUT_MARKERS_BY_LANGUAGE[language] || [];
  const outputMarkers = OUTPUT_MARKERS_BY_LANGUAGE[language] || [];

  const hasInputRead = inputMarkers.length ? anyMatch(source, inputMarkers) : false;
  const hasOutputCalls = outputMarkers.length ? anyMatch(source, outputMarkers) : false;
  const hasControlFlow = anyMatch(source, CONTROL_FLOW_MARKERS);

  const literalOutputLineCount = significantLines
    .filter((line) => OUTPUT_LITERAL_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .length;
  const isOutputLiteralOnly =
    significantLines.length > 0 && literalOutputLineCount === significantLines.length;

  const containsHelloWorld =
    /\bhello\s*world\b/i.test(lowerSource) || /\bhello\s*world\b/i.test(lowerStdout);

  return {
    significantLineCount: significantLines.length,
    hasInputRead,
    hasOutputCalls,
    hasControlFlow,
    isOutputLiteralOnly,
    containsHelloWorld,
  };
}

module.exports = {
  analyzeSnakeSubmission,
};

