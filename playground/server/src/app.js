/* ═══════════════════════════════════════════════════════════
   AlgoArena — Express application
   ═══════════════════════════════════════════════════════════ */

'use strict';

const express = require('express');
const path    = require('path');
const config  = require('./config');

const corsMiddleware = require('./middleware/cors');
const rateLimiter    = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const healthRoute    = require('./routes/health');
const executionRoute = require('./routes/execution');

const app = express();

/* Trust the nginx reverse proxy for X-Forwarded-For (High #7) */
app.set('trust proxy', 'loopback');

/* ─── Global middleware ─── */
app.use(corsMiddleware);
app.use(express.json({ limit: config.JSON_LIMIT, strict: true }));

/* ─── API routes ─── */
app.use('/api', healthRoute);
app.use('/api', rateLimiter, executionRoute);

/* ─── Serve client in development ─── */
if (config.NODE_ENV !== 'production') {
  app.use(express.static(config.CLIENT_DIR));
  app.get('*', (req, res, next) => {
    // Only serve index.html for non-API, non-WS routes
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(config.CLIENT_DIR, 'index.html'));
  });
}

/* ─── Error handling ─── */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
