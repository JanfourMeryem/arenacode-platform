/* ═══════════════════════════════════════════════════════════
   AlgoArena — CORS middleware
   ═══════════════════════════════════════════════════════════ */

'use strict';

const cors = require('cors');
const config = require('../config');

module.exports = cors({
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});
