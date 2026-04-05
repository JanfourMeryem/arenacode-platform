/* ═══════════════════════════════════════════════════════════
   AlgoArena — Configuration
   Single source of truth for all configurable values.
   Override via environment variables.
   ═══════════════════════════════════════════════════════════ */

'use strict';

const path = require('path');

module.exports = Object.freeze({
  /* ─── Server ─── */
  PORT:           parseInt(process.env.PORT, 10)           || 3000,
  HOST:           process.env.HOST                         || '0.0.0.0',
  NODE_ENV:       process.env.NODE_ENV                     || 'development',

  /* ─── CORS ─── */
  CORS_ORIGIN:    process.env.CORS_ORIGIN                  || '*',

  /* ─── Static files (dev only; nginx serves in prod) ─── */
  CLIENT_DIR:     process.env.CLIENT_DIR
                  || path.resolve(__dirname, '..', '..', 'client'),

  /* ─── Execution limits ─── */
  EXEC_TIMEOUT:   parseInt(process.env.EXEC_TIMEOUT, 10)   || 30_000,   // ms
  MAX_OUTPUT:     parseInt(process.env.MAX_OUTPUT, 10)      || 64 * 1024, // bytes
  MAX_FILES:      parseInt(process.env.MAX_FILES, 10)       || 20,
  MAX_FILE_SIZE:  parseInt(process.env.MAX_FILE_SIZE, 10)   || 256 * 1024, // bytes per file
  JSON_LIMIT:     process.env.JSON_LIMIT                    || '1mb',

  /* ─── Rate limiting ─── */
  RATE_WINDOW_MS: parseInt(process.env.RATE_WINDOW_MS, 10)  || 60_000,   // 1 min
  RATE_MAX_REQ:   parseInt(process.env.RATE_MAX_REQ, 10)    || 30,       // per window

  /* ─── WebSocket ─── */
  WS_MAX_CONNECTIONS: parseInt(process.env.WS_MAX_CONNECTIONS, 10) || 50,
  WS_HEARTBEAT_MS:   parseInt(process.env.WS_HEARTBEAT_MS, 10)    || 30_000,

  /* ─── Default entry files per language ─── */
  DEFAULT_ENTRY: Object.freeze({
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
  }),

  /* ─── Supported languages ─── */
  SUPPORTED_LANGUAGES: Object.freeze([
    'python', 'java', 'c', 'cpp', 'csharp', 'php',
    'javascript', 'typescript', 'go', 'ruby',
  ]),
});
