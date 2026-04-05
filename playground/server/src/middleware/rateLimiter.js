/* ═══════════════════════════════════════════════════════════
   AlgoArena — Rate limiter
   Simple in-memory rate limiter per IP.
   In production, swap with redis-backed solution if needed.
   ═══════════════════════════════════════════════════════════ */

'use strict';

const config = require('../config');

const buckets = new Map();

/* Clean stale entries every 2 minutes */
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets) {
    if (now - bucket.start > config.RATE_WINDOW_MS * 2) {
      buckets.delete(ip);
    }
  }
}, 120_000).unref();

function rateLimiter(req, res, next) {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();

  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.start > config.RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(ip, bucket);
  }

  bucket.count++;

  if (bucket.count > config.RATE_MAX_REQ) {
    const retryAfter = Math.ceil((config.RATE_WINDOW_MS - (now - bucket.start)) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      stdout: '',
      stderr: 'Too many requests. Please slow down.',
    });
  }

  next();
}

module.exports = rateLimiter;
