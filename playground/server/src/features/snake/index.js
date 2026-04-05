'use strict';

const constants = require('./constants');
const mode = require('./mode');
const snakeConfig = require('./config');
const stdin = require('./stdin');
const movesParser = require('./movesParser');
const simulator = require('./simulator');
const simulationBuilder = require('./simulationBuilder');
const judge = require('./judge');
const submissionAnalysis = require('./submissionAnalysis');
const submissionValidator = require('./submissionValidator');

module.exports = {
  ...constants,
  ...mode,
  ...snakeConfig,
  ...stdin,
  ...movesParser,
  ...simulator,
  ...simulationBuilder,
  ...judge,
  ...submissionAnalysis,
  ...submissionValidator,
};
