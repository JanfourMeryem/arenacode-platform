'use strict';

const { toSafeText } = require('../../utils/helpers');
const { LABYRINTH_MOVE_TOKEN_TO_DIRECTION } = require('./constants');

function parseLabyrinthMovesFromStdout(stdout) {
  if (typeof stdout !== 'string') {
    return {
      success: false,
      moves: [],
      error: 'Invalid output: expected one move per line (1=UP, 2=DOWN, 3=RIGHT, 4=LEFT).',
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
      error: 'Invalid output: no moves produced. Print one move code per line (1, 2, 3, 4).',
    };
  }

  const moves = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const lineNumber = index + 1;

    if (!line) {
      return {
        success: false,
        moves: [],
        error: `Invalid output at line ${lineNumber}: empty lines are only allowed at the end.`,
      };
    }

    const direction = LABYRINTH_MOVE_TOKEN_TO_DIRECTION[line.toUpperCase()];
    if (!direction) {
      return {
        success: false,
        moves: [],
        error: `Invalid move token "${toSafeText(line, 16)}" at line ${lineNumber}. Allowed: 1, 2, 3, 4, UP, DOWN, RIGHT, LEFT.`,
      };
    }

    moves.push(direction);
  }

  return {
    success: true,
    moves,
    error: '',
  };
}

module.exports = {
  parseLabyrinthMovesFromStdout,
};
