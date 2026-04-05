/* ═══════════════════════════════════════════════════════════
   AlgoArena — Health route
   ═══════════════════════════════════════════════════════════ */

'use strict';

const { Router } = require('express');
const os = require('os');
const config = require('../config');

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    env: config.NODE_ENV,
    platform: os.platform(),
    node: process.version,
  });
});

module.exports = router;
