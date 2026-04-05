'use strict';

const ROCK_PAPER_SCISSORS_MOVE_CODE_TO_NAME = Object.freeze({
  1: 'ROCK',
  2: 'PAPER',
  3: 'SCISSORS',
});

const ROCK_PAPER_SCISSORS_ALLOWED_MOVE_CODES = Object.freeze(['1', '2', '3']);

const DEFAULT_ROCK_PAPER_SCISSORS_GENERATION_CONFIG = Object.freeze({
  minRounds: 5,
  maxRounds: 12,
  tickDurationMs: 900,
});

module.exports = {
  ROCK_PAPER_SCISSORS_MOVE_CODE_TO_NAME,
  ROCK_PAPER_SCISSORS_ALLOWED_MOVE_CODES,
  DEFAULT_ROCK_PAPER_SCISSORS_GENERATION_CONFIG,
};
