'use strict';

const { parseTreasureMovesFromStdout } = require('./movesParser');
const { simulateTreasureRun } = require('./simulator');
const { buildTreasureSimulationFromResult } = require('./simulationBuilder');

function buildInvalidOutputResult(reason, config) {
  return {
    status: 'invalid_output',
    reason,
    parsedMoves: 0,
    executedMoves: 0,
    finalLaneCode: config.startLaneCode,
    finalLane: config.startLaneName,
    collectedCoins: 0,
    missedCoins: 0,
    optimalCoins: config.optimalCoins,
    totalCoins: config.totalCoins,
    perfectSteps: 0,
    steps: [],
  };
}

function buildTreasureExecutionResult(stdout, config) {
  const parsed = parseTreasureMovesFromStdout(stdout, config.length);

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
        finalLane: invalidResult.finalLane,
        finalLaneCode: invalidResult.finalLaneCode,
        collectedCoins: 0,
        missedCoins: 0,
        optimalCoins: config.optimalCoins,
        totalCoins: config.totalCoins,
        perfectSteps: 0,
      },
      simulation: null,
    };
  }

  const simulationResult = simulateTreasureRun(config, parsed.moves);

  return {
    config,
    rejected: false,
    judge: {
      status: simulationResult.status,
      reason: simulationResult.reason,
      parsedMoves: simulationResult.parsedMoves,
      executedMoves: simulationResult.executedMoves,
      finalLane: simulationResult.finalLane,
      finalLaneCode: simulationResult.finalLaneCode,
      collectedCoins: simulationResult.collectedCoins,
      missedCoins: simulationResult.missedCoins,
      optimalCoins: simulationResult.optimalCoins,
      totalCoins: simulationResult.totalCoins,
      perfectSteps: simulationResult.perfectSteps,
    },
    simulation: buildTreasureSimulationFromResult(config, simulationResult),
  };
}

module.exports = {
  buildTreasureExecutionResult,
};
