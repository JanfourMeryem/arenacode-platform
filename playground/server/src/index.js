/* ═══════════════════════════════════════════════════════════
   AlgoArena — Server entrypoint
   Boots HTTP + WebSocket on the same port.
   ═══════════════════════════════════════════════════════════ */

'use strict';

const path = require('path');
const os   = require('os');
const fs   = require('fs/promises');

const app    = require('./app');
const config = require('./config');
const log    = require('./utils/logger');
const { attachWebSocket } = require('./websocket/executionHandler');

/* Clean orphaned temp dirs from previous crashes (Medium #14) */
const BASE_DIR = path.join(os.tmpdir(), 'algoarena');
fs.rm(BASE_DIR, { recursive: true, force: true }).catch(() => {});

const server = app.listen(config.PORT, config.HOST, () => {
  log.info(`Server listening on http://${config.HOST}:${config.PORT}`);
  log.info(`Environment: ${config.NODE_ENV}`);
  if (config.NODE_ENV !== 'production') {
    log.info(`Client dir: ${config.CLIENT_DIR}`);
  }
});

/* Attach WebSocket to same HTTP server */
attachWebSocket(server);

/* Global error handlers (Medium #9) */
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

/* Graceful shutdown */
const shutdown = (signal) => {
  log.info(`${signal} received — shutting down`);
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    log.warn('Forcing shutdown after timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
