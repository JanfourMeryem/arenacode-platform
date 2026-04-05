'use strict';

const { generateRandomLabyrinthConfig } = require('./boardGenerator');
const { buildLabyrinthStdinContract } = require('./stdin');
const { buildLabyrinthExecutionResult } = require('./judge');

module.exports = {
  generateRandomLabyrinthConfig,
  buildLabyrinthStdinContract,
  buildLabyrinthExecutionResult,
};
