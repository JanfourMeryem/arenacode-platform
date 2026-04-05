'use strict';

const { toSafeText } = require('../../utils/helpers');
const { SNAKE_MOVE_CODE_TO_DIRECTION } = require('./constants');

function parseSnakeMovesFromStdout(stdout) {
  if (typeof stdout !== 'string') {
    return {
      success: false,
      moves: [],
      error: 'Invalid output: expected one move code per line (1=UP, 2=DOWN, 3=RIGHT, 4=LEFT).',
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
      error: 'Invalid output: no moves produced. Print one move code per line (1=UP, 2=DOWN, 3=RIGHT, 4=LEFT).',
    };
  }

  const moves = [];
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();
    const lineNumber = index + 1;

    if (!trimmed) {
      return {
        success: false,
        moves: [],
        error: `Invalid output at line ${lineNumber}: empty lines are only allowed at the end.`,
      };
    }

    const mapped = SNAKE_MOVE_CODE_TO_DIRECTION[trimmed];
    if (!mapped) {
      return {
        success: false,
        moves: [],
        error: `Invalid move code "${toSafeText(trimmed, 12)}" at line ${lineNumber}. Allowed: 1, 2, 3, 4.`,
      };
    }

    moves.push(mapped);
  }

  return {
    success: true,
    moves,
    error: '',
  };
}

module.exports = {
  parseSnakeMovesFromStdout,
};

