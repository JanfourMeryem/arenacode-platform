'use strict';

const { toSafeText } = require('../../utils/helpers');
const { ROCK_PAPER_SCISSORS_ALLOWED_MOVE_CODES } = require('./constants');

function parseRockPaperScissorsMovesFromStdout(stdout, expectedRounds) {
  if (!Number.isInteger(expectedRounds) || expectedRounds <= 0) {
    return {
      success: false,
      moves: [],
      error: 'Internal error: invalid expected move count for Rock Paper Scissors challenge.',
    };
  }

  if (typeof stdout !== 'string') {
    return {
      success: false,
      moves: [],
      error: 'Invalid output: expected one move code per line (1=ROCK, 2=PAPER, 3=SCISSORS).',
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
      error: `Invalid output: expected exactly ${expectedRounds} lines with 1, 2 or 3.`,
    };
  }

  if (lines.length !== expectedRounds) {
    return {
      success: false,
      moves: [],
      error: `Invalid output: expected ${expectedRounds} moves, received ${lines.length}.`,
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

    if (!ROCK_PAPER_SCISSORS_ALLOWED_MOVE_CODES.includes(token)) {
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
  parseRockPaperScissorsMovesFromStdout,
};
