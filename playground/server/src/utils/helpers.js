/* ═══════════════════════════════════════════════════════════
   AlgoArena — Shared helpers
   ═══════════════════════════════════════════════════════════ */

'use strict';

/**
 * Return true if value is a non-empty string.
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Sanitise a user-supplied relative file path.
 * Prevents directory traversal, absolute paths, and hidden-dot tricks.
 * Returns the cleaned path or null if invalid.
 */
function sanitizeRelativePath(input) {
  if (!isNonEmptyString(input)) return null;

  // Reject null bytes (Medium #12)
  if (input.includes('\0')) return null;

  const cleaned = input
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');

  if (!cleaned) return null;
  if (cleaned.startsWith('/') || cleaned.startsWith('.')) return null;
  if (cleaned.includes('..')) return null;
  return cleaned;
}

/**
 * Truncate string to maxLen, adding "..." if clipped.
 */
function toSafeText(value, maxLen = 120) {
  if (typeof value !== 'string') return '';
  return value.length > maxLen ? `${value.slice(0, maxLen)}...` : value;
}

/**
 * Append chunk to current string without exceeding maxLen.
 */
function truncateAndAppend(current, chunk, maxLen) {
  if (current.length >= maxLen) return current;
  const remaining = maxLen - current.length;
  return current + chunk.slice(0, remaining);
}

module.exports = {
  isNonEmptyString,
  sanitizeRelativePath,
  toSafeText,
  truncateAndAppend,
};
