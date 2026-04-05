'use strict';

const { generateRandomTreasureConfig } = require('./generator');
const { buildTreasureStdinContract } = require('./stdin');
const { buildTreasureExecutionResult } = require('./judge');

module.exports = {
  generateRandomTreasureConfig,
  buildTreasureStdinContract,
  buildTreasureExecutionResult,
};

