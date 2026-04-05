'use strict';

const { parseLabyrinthMovesFromStdout } = require('./movesParser');
const { simulateLabyrinthRun } = require('./simulator');
const { buildLabyrinthSimulationFromResult } = require('./simulationBuilder');

function buildInvalidOutputResult(reason, config) {
  return {
    status: 'invalid_output',
    reason,
    failedStep: null,
    parsedMoves: 0,
    executedMoves: 0,
    finalPosition: {
      x: config.startPosition.x,
      y: config.startPosition.y,
    },
    visitedCount: 1,
    steps: [{ t: 0, move: 'START' }],
  };
}

function buildLabyrinthExecutionResult(stdout, config) {
  const parsed = parseLabyrinthMovesFromStdout(stdout);

  if (!parsed.success) {
    const invalidResult = buildInvalidOutputResult(parsed.error, config);
    return {
      config,
      rejected: true,
      judge: {
        status: 'invalid_output',
        reason: parsed.error,
        parsedMoves: 0,
        executedMoves: 0,
        failedStep: null,
        finalPosition: { ...invalidResult.finalPosition },
        visitedCells: 1,
      },
      simulation: buildLabyrinthSimulationFromResult(config, invalidResult),
    };
  }

  const simulationResult = simulateLabyrinthRun(config, parsed.moves);
  const judgeStatus = simulationResult.status;

  return {
    config,
    rejected: false,
    judge: {
      status: judgeStatus,
      reason: simulationResult.reason,
      parsedMoves: simulationResult.parsedMoves,
      executedMoves: simulationResult.executedMoves,
      failedStep: simulationResult.failedStep,
      finalPosition: simulationResult.finalPosition,
      visitedCells: simulationResult.visitedCount,
    },
    simulation: buildLabyrinthSimulationFromResult(config, simulationResult),
  };
}

module.exports = {
  buildLabyrinthExecutionResult,
};
