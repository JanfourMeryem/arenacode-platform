'use strict';

const { toSafeText } = require('../../utils/helpers');
const { TREASURE_ALLOWED_MOVE_CODES } = require('./constants');

function parseTreasureMovesFromStdout(stdout, expectedMoves) {
  if (!Number.isInteger(expectedMoves) || expectedMoves <= 0) {
    return {
      success: false,
      moves: [],
      error: 'Internal error: invalid expected move count for Treasure challenge.',
    };
  }

  if (typeof stdout !== 'string') {
    return {
      success: false,
      moves: [],
      error: 'Invalid output: expected one move code per line (1=LEFT, 2=CENTER, 3=RIGHT).',
    };
  }

  const lines = stdout.replace(/\r/g, '').split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  if (!lines.length) {
    return {
      success: false,
      moves: [],
      error: `Invalid output: expected exactly ${expectedMoves} lines with 1, 2 or 3.`,
    };
  }

  if (lines.length !== expectedMoves) {
    return {
      success: false,
      moves: [],
      error: `Invalid output: expected ${expectedMoves} moves, received ${lines.length}.`,
    };
  }

  const moves = [];
  for (let index = 0; index < lines.length; index += 1) {
    const token = lines[index].trim();
    const lineNumber = index + 1;

    if (!token) {
      return {
        success: false,
        moves: [],
        error: `Invalid output at line ${lineNumber}: empty move.`,
      };
    }

    if (!TREASURE_ALLOWED_MOVE_CODES.includes(token)) {
      return {
        success: false,
        moves: [],
        error: `Invalid move token "${toSafeText(token, 16)}" at line ${lineNumber}. Allowed: 1, 2, 3.`,
      };
    }

    moves.push(Number(token));
  }

  return {
    success: true,
    moves,
    error: '',
  };
}

module.exports = {
  parseTreasureMovesFromStdout,
};

