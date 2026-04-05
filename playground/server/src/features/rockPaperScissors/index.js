'use strict';

const { generateRandomRockPaperScissorsConfig } = require('./bot');
const { buildRockPaperScissorsStdinContract } = require('./stdin');
const { buildRockPaperScissorsExecutionResult } = require('./judge');

module.exports = {
  generateRandomRockPaperScissorsConfig,
  buildRockPaperScissorsStdinContract,
  buildRockPaperScissorsExecutionResult,
};
