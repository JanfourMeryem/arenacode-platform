'use strict';

const { parseSnakeMovesFromStdout } = require('./movesParser');
const { simulateSnakeTrail } = require('./simulator');
const { buildSnakeSimulationFromResult } = require('./simulationBuilder');

function buildSnakeExecutionResult(stdout, config) {
  const parsed = parseSnakeMovesFromStdout(stdout);

  if (!parsed.success) {
    // Preserve execution output, but mark run as invalid for snake simulation delivery.
    const judge = {
      status: 'invalid_output',
      reason: parsed.error,
      parsedMoves: 0,
      executedMoves: 0,
      failedTurn: null,
      finalPosition: { ...config.startPosition },
      visitedCells: 1,
    };
    return {
      config,
      judge,
      simulation: buildSnakeSimulationFromResult(config, [], {
        status: 'invalid_output',
        reason: parsed.error,
      }),
    };
  }

  const simulationResult = simulateSnakeTrail(config, parsed.moves);
  const judgeStatus = simulationResult.status === 'success' ? 'success' : simulationResult.status;
  const judge = {
    status: judgeStatus,
    reason: simulationResult.reason,
    parsedMoves: parsed.moves.length,
    executedMoves: simulationResult.replayDirections.length,
    failedTurn: simulationResult.failedTurn,
    finalPosition: simulationResult.finalPosition,
    visitedCells: simulationResult.visitedCount,
  };

  return {
    config,
    judge,
    simulation: buildSnakeSimulationFromResult(
      config,
      simulationResult.replayDirections,
      simulationResult
    ),
  };
}

module.exports = {
  buildSnakeExecutionResult,
};
