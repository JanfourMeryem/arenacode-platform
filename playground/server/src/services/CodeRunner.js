/* ═══════════════════════════════════════════════════════════
   AlgoArena — CodeRunner service
   Handles compilation and execution for all supported
   languages. Used by both HTTP /api/execute and WebSocket.
   ═══════════════════════════════════════════════════════════ */

'use strict';

const path = require('path');
const os   = require('os');
const fs   = require('fs/promises');
const { spawn } = require('child_process');

const config = require('../config');
const { sanitizeRelativePath, truncateAndAppend } = require('../utils/helpers');
const log = require('../utils/logger');

const BASE_DIR = path.join(os.tmpdir(), 'algoarena');

/* ─────────────────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────────────────── */

/**
 * Batch (non-interactive) execution — collects all output then returns.
 * Used by POST /api/execute (legacy / game simulations).
 */
async function executeBatch(language, files, entryFile, stdin = '') {
  const runDir = await _createRunDir('batch-');
  try {
    const prepared = _prepareFiles(files);
    if (!prepared.length) return _fail('No valid files provided.');

    await _writeFiles(runDir, prepared);
    const resolvedEntry = _resolveEntry(language, entryFile, prepared);

    switch (language) {
      case 'python':     return await _batchInterpreted(runDir, 'python3', ['-u', resolvedEntry], stdin);
      case 'php':         return await _batchInterpreted(runDir, 'php', [resolvedEntry], stdin);
      case 'javascript':  return await _batchInterpreted(runDir, 'node', [resolvedEntry], stdin);
      case 'ruby':        return await _batchInterpreted(runDir, 'ruby', [resolvedEntry], stdin);
      case 'typescript': {
        const comp = await _compile(runDir, 'tsc', [resolvedEntry, '--outDir', path.join(runDir, '_tsout'), '--esModuleInterop', '--resolveJsonModule']);
        if (!comp.success) return _fail(comp.stderr);
        const outFile = path.join(runDir, '_tsout', resolvedEntry.replace(/\.ts$/, '.js'));
        return await _batchInterpreted(runDir, 'node', [outFile], stdin);
      }
      case 'go': {
        const comp = await _compile(runDir, 'go', ['build', '-o', path.join(runDir, 'main'), resolvedEntry]);
        if (!comp.success) return _fail(comp.stderr);
        return await _batchExecutable(runDir, path.join(runDir, 'main'), stdin);
      }

      case 'c': {
        const src = _listSources(prepared, ['.c']);
        if (!src.length) return _fail('No .c source files.');
        const comp = await _compile(runDir, 'gcc', [...src, '-o', 'main']);
        if (!comp.success) return _fail(comp.stderr);
        return await _batchExecutable(runDir, path.join(runDir, 'main'), stdin);
      }
      case 'cpp': {
        const src = _listSources(prepared, ['.cpp', '.cc', '.cxx']);
        if (!src.length) return _fail('No .cpp source files.');
        const comp = await _compile(runDir, 'g++', [...src, '-o', 'main']);
        if (!comp.success) return _fail(comp.stderr);
        return await _batchExecutable(runDir, path.join(runDir, 'main'), stdin);
      }
      case 'java': {
        const src = _listSources(prepared, ['.java']);
        if (!src.length) return _fail('No .java source files.');
        const comp = await _compile(runDir, 'javac', src);
        if (!comp.success) return _fail(comp.stderr);
        const mainClass = path.basename(resolvedEntry, '.java');
        return await _batchInterpreted(runDir, 'java', ['-cp', runDir, mainClass], stdin);
      }
      case 'csharp': {
        const scaffold = await _runSync(runDir, 'dotnet', ['new', 'console', '--force', '--no-restore'], 15_000);
        if (!scaffold.success) return _fail(scaffold.stderr);
        await fs.writeFile(path.join(runDir, 'Program.cs'), '', 'utf8');
        await _writeFiles(runDir, prepared);
        const build = await _runSync(runDir, 'dotnet', ['build'], 30_000);
        if (!build.success) return _fail(build.stderr || 'Build failed.');
        return await _batchDotnetRun(runDir, stdin);
      }
      default: return _fail(`Unsupported language: ${language}`);
    }
  } finally {
    _cleanDir(runDir);
  }
}

/**
 * Interactive execution — spawns a child process and returns it.
 * Used by WebSocket handler for real-time stdin/stdout.
 *
 * @returns {{ child: ChildProcess|null, runDir: string, compileError: string|null }}
 */
async function executeInteractive(language, files, entryFile, onInfo) {
  const runDir = await _createRunDir('ws-');
  const prepared = _prepareFiles(files);
  if (!prepared.length) return { compileError: 'No valid files.', runDir, child: null };

  await _writeFiles(runDir, prepared);
  const resolvedEntry = _resolveEntry(language, entryFile, prepared);

  switch (language) {
    case 'python': {
      onInfo?.('Launching Python runtime…\r\n');
      const child = spawn('python3', ['-u', resolvedEntry], { cwd: runDir });
      return { child, runDir };
    }
    case 'php': {
      onInfo?.('Launching PHP runtime…\r\n');
      const child = spawn('php', [resolvedEntry], { cwd: runDir });
      return { child, runDir };
    }
    case 'javascript': {
      onInfo?.('Launching Node.js runtime…\r\n');
      const child = spawn('node', [resolvedEntry], { cwd: runDir });
      return { child, runDir };
    }
    case 'ruby': {
      onInfo?.('Launching Ruby runtime…\r\n');
      const child = spawn('ruby', [resolvedEntry], { cwd: runDir });
      return { child, runDir };
    }
    case 'typescript': {
      onInfo?.('Compiling TypeScript (tsc)…\r\n');
      const comp = await _compile(runDir, 'tsc', [resolvedEntry, '--outDir', path.join(runDir, '_tsout'), '--esModuleInterop', '--resolveJsonModule']);
      if (!comp.success) return { compileError: comp.stderr, runDir, child: null };
      const outFile = path.join(runDir, '_tsout', resolvedEntry.replace(/\.ts$/, '.js'));
      onInfo?.('Compilation finished ✓ Launching Node.js…\r\n');
      return { child: spawn('node', [outFile], { cwd: runDir }), runDir };
    }
    case 'go': {
      onInfo?.('Building Go program…\r\n');
      const comp = await _compile(runDir, 'go', ['build', '-o', path.join(runDir, 'main'), resolvedEntry]);
      if (!comp.success) return { compileError: comp.stderr, runDir, child: null };
      onInfo?.('Build finished ✓ Launching program…\r\n');
      return { child: spawn(path.join(runDir, 'main'), [], { cwd: runDir }), runDir };
    }
    case 'c': {
      const src = _listSources(prepared, ['.c']);
      if (!src.length) return { compileError: 'No .c source files.', runDir, child: null };
      onInfo?.('Compiling C sources (gcc)…\r\n');
      const comp = await _compile(runDir, 'gcc', [...src, '-o', 'main']);
      if (!comp.success) return { compileError: comp.stderr, runDir, child: null };
      onInfo?.('Compilation finished ✓ Launching program…\r\n');
      // Use stdbuf to disable stdout/stderr buffering so printf without \n flushes immediately
      return { child: spawn('stdbuf', ['-o0', '-e0', path.join(runDir, 'main')], { cwd: runDir }), runDir };
    }
    case 'cpp': {
      const src = _listSources(prepared, ['.cpp', '.cc', '.cxx']);
      if (!src.length) return { compileError: 'No .cpp source files.', runDir, child: null };
      onInfo?.('Compiling C++ sources (g++)…\r\n');
      const comp = await _compile(runDir, 'g++', [...src, '-o', 'main']);
      if (!comp.success) return { compileError: comp.stderr, runDir, child: null };
      onInfo?.('Compilation finished ✓ Launching program…\r\n');
      // Use stdbuf to disable stdout/stderr buffering
      return { child: spawn('stdbuf', ['-o0', '-e0', path.join(runDir, 'main')], { cwd: runDir }), runDir };
    }
    case 'java': {
      const src = _listSources(prepared, ['.java']);
      if (!src.length) return { compileError: 'No .java source files.', runDir, child: null };
      onInfo?.('Compiling Java sources (javac)…\r\n');
      const comp = await _compile(runDir, 'javac', src);
      if (!comp.success) return { compileError: comp.stderr, runDir, child: null };
      const mainClass = path.basename(resolvedEntry, '.java');
      onInfo?.('Compilation finished ✓ Launching JVM…\r\n');
      return { child: spawn('java', ['-cp', runDir, mainClass], { cwd: runDir }), runDir };
    }
    case 'csharp': {
      onInfo?.('Setting up .NET project…\r\n');
      const scaffold = await _runSync(runDir, 'dotnet', ['new', 'console', '--force', '--no-restore'], 15_000);
      if (!scaffold.success) return { compileError: scaffold.stderr, runDir, child: null };
      await fs.writeFile(path.join(runDir, 'Program.cs'), '', 'utf8');
      await _writeFiles(runDir, prepared);
      onInfo?.('Building C# project (dotnet build)…\r\n');
      const build = await _runSync(runDir, 'dotnet', ['build'], 30_000);
      if (!build.success) return { compileError: build.stderr || 'Build failed.', runDir, child: null };
      onInfo?.('Build finished ✓ Launching .NET runtime…\r\n');
      return { child: spawn('dotnet', ['run', '--no-build', '--no-restore'], { cwd: runDir }), runDir };
    }
    default:
      return { compileError: `Unsupported language: ${language}`, runDir, child: null };
  }
}

/**
 * Remove a run directory (best-effort).
 */
function cleanRunDir(runDir) {
  _cleanDir(runDir);
}

module.exports = { executeBatch, executeInteractive, cleanRunDir };

/* ─────────────────────────────────────────────────────────
   Internal helpers
   ───────────────────────────────────────────────────────── */

async function _createRunDir(prefix) {
  await fs.mkdir(BASE_DIR, { recursive: true });
  return fs.mkdtemp(path.join(BASE_DIR, prefix));
}

function _prepareFiles(rawFiles) {
  if (!Array.isArray(rawFiles)) return [];
  const out = [];
  for (const f of rawFiles) {
    if (!f || typeof f !== 'object') continue;
    const name = sanitizeRelativePath(f.name);
    if (!name) continue;
    const content = typeof f.content === 'string' ? f.content : (typeof f.code === 'string' ? f.code : '');
    // Enforce per-file size limit (High #4)
    if (Buffer.byteLength(content, 'utf8') > config.MAX_FILE_SIZE) continue;
    out.push({ name, content });
    if (out.length >= config.MAX_FILES) break;
  }
  return out;
}

async function _writeFiles(runDir, files) {
  const resolvedRunDir = path.resolve(runDir) + path.sep;
  for (const f of files) {
    const target = path.resolve(runDir, f.name);
    if (!target.startsWith(resolvedRunDir) && target !== path.resolve(runDir)) {
      throw new Error('Path traversal detected.');
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, f.content, 'utf8');
  }
}

function _resolveEntry(language, entryFile, files) {
  const defaultEntry = config.DEFAULT_ENTRY[language] || 'main.txt';
  const candidate = entryFile ? sanitizeRelativePath(entryFile) : null;
  const names = new Set(files.map((f) => f.name));
  if (candidate && names.has(candidate)) return candidate;
  if (names.has(defaultEntry)) return defaultEntry;
  return files[0].name;
}

function _listSources(files, extensions) {
  const lower = extensions.map((e) => e.toLowerCase());
  return files.map((f) => f.name).filter((n) => lower.some((e) => n.toLowerCase().endsWith(e)));
}

function _fail(stderr) {
  return { success: false, stdout: '', stderr };
}

function _cleanDir(dirPath) {
  if (!dirPath) return;
  fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
}

/* ─── Compile helper (gcc/g++/javac) ─── */

function _compile(cwd, cmd, args) {
  const MAX = config.MAX_OUTPUT;
  const COMPILE_TIMEOUT = 15_000; // 15 second compile limit (High #5)
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ success: false, stderr: `Compilation timed out after ${COMPILE_TIMEOUT / 1000}s.` });
    }, COMPILE_TIMEOUT);
    child.stderr.on('data', (d) => { stderr = truncateAndAppend(stderr, d.toString(), MAX); });
    child.on('error', (err) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT') {
        resolve({ success: false, stderr: `${cmd} not found. Make sure it is installed and in PATH.` });
        return;
      }
      resolve({ success: false, stderr: err.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ success: code === 0, stderr: stderr.trim() });
    });
  });
}

/* ─── Batch interpreted (python, php, java run) ─── */

function _batchInterpreted(cwd, cmd, args, stdin) {
  const MAX = config.MAX_OUTPUT;
  const TIMEOUT = config.EXEC_TIMEOUT;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });
    let stdout = '', stderr = '', timedOut = false;

    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TIMEOUT);
    _feedStdin(child, stdin);

    child.stdout.on('data', (d) => { stdout = truncateAndAppend(stdout, d.toString(), MAX); });
    child.stderr.on('data', (d) => { stderr = truncateAndAppend(stderr, d.toString(), MAX); });
    child.on('error', (e) => {
      clearTimeout(timer);
      if (e.code === 'ENOENT') {
        resolve({ success: false, stdout: '', stderr: `${cmd} not found. Make sure it is installed and in PATH.` });
        return;
      }
      resolve({ success: false, stdout, stderr: e.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return resolve({ success: false, stdout, stderr: stderr || 'Timeout exceeded' });
      resolve(code === 0
        ? { success: true, stdout, stderr }
        : { success: false, stdout, stderr: stderr || 'Execution failed.' });
    });
  });
}

/* ─── Batch native executable ─── */

function _batchExecutable(cwd, exePath, stdin) {
  const MAX = config.MAX_OUTPUT;
  const TIMEOUT = config.EXEC_TIMEOUT;
  return new Promise((resolve, reject) => {
    const child = spawn(exePath, [], { cwd });
    let stdout = '', stderr = '', timedOut = false;

    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TIMEOUT);
    _feedStdin(child, stdin);

    child.stdout.on('data', (d) => { stdout = truncateAndAppend(stdout, d.toString(), MAX); });
    child.stderr.on('data', (d) => { stderr = truncateAndAppend(stderr, d.toString(), MAX); });
    child.on('error', (e) => {
      clearTimeout(timer);
      if (e.code === 'ENOENT') {
        resolve({ success: false, stdout: '', stderr: `Executable not found: ${exePath}` });
        return;
      }
      resolve({ success: false, stdout, stderr: e.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return resolve({ success: false, stdout, stderr: stderr || 'Timeout exceeded' });
      resolve(code === 0
        ? { success: true, stdout, stderr }
        : { success: false, stdout, stderr: stderr || 'Execution failed.' });
    });
  });
}

/* ─── Batch dotnet run ─── */

function _batchDotnetRun(cwd, stdin) {
  return _batchInterpreted(cwd, 'dotnet', ['run', '--no-build', '--no-restore'], stdin);
}

/* ─── Synchronous command runner (compile, dotnet new/build) ─── */

function _runSync(cwd, cmd, args, timeoutMs = 15_000) {
  const MAX = config.MAX_OUTPUT;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });
    let stdout = '', stderr = '', timedOut = false;

    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);

    child.stdout.on('data', (d) => { stdout = truncateAndAppend(stdout, d.toString(), MAX); });
    child.stderr.on('data', (d) => { stderr = truncateAndAppend(stderr, d.toString(), MAX); });
    child.on('error', (err) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT') {
        resolve({ success: false, stdout: '', stderr: `${cmd} not found. Install it and add to PATH.`, timedOut: false });
        return;
      }
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ success: code === 0, exitCode: code, stdout, stderr: stderr.trim(), timedOut });
    });
  });
}

/* ─── Feed stdin and close ─── */

function _feedStdin(child, text) {
  if (!child.stdin) return;
  child.stdin.on('error', () => {}); // swallow EPIPE
  if (typeof text === 'string' && text.length > 0) child.stdin.write(text);
  child.stdin.end();
}
