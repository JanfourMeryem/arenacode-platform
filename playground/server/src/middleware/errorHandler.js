/* ═══════════════════════════════════════════════════════════
   AlgoArena — Error handling middleware
   ═══════════════════════════════════════════════════════════ */

'use strict';

const log = require('../utils/logger');

/* 404 — unknown route */
function notFound(req, res, _next) {
  res.status(404).json({ success: false, message: 'Not found.' });
}

/* Global error handler */
function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  /* Bad JSON body */
  const isJsonError =
    (err && err.type === 'entity.parse.failed') ||
    (err instanceof SyntaxError && err.status === 400);

  if (isJsonError) {
    return res.status(400).json({ success: false, stdout: '', stderr: 'Invalid JSON payload.' });
  }

  log.error('Unhandled error', { message: err.message, stack: err.stack });
  return res.status(500).json({ success: false, stdout: '', stderr: 'Unexpected server error.' });
}

module.exports = { notFound, errorHandler };
