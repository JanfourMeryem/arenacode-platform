'use strict';

function normalizeExecutionMode(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'snake'
    ? 'snake'
    : 'run';
}

function isSnakeExecutionMode(value) {
  return normalizeExecutionMode(value) === 'snake';
}

module.exports = {
  normalizeExecutionMode,
  isSnakeExecutionMode,
};

