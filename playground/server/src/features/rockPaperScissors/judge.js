'use strict';

const { parseRockPaperScissorsMovesFromStdout } = require('./movesParser');
const { simulateRockPaperScissorsMatch } = require('./simulator');
const { buildRockPaperScissorsSimulationFromResult } = require('./simulationBuilder');

function buildRockPaperScissorsExecutionResult(stdout, config) {
  const parsed = parseRockPaperScissorsMovesFromStdout(stdout, config.rounds);

  if (!parsed.success) {
    return {
      config,
      rejected: true,
      judge: {
        status: 'invalid_output',
        reason: parsed.error,
        parsedMoves: 0,
        executedMoves: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      },
      simulation: null,
    };
  }

  const simulationResult = simulateRockPaperScissorsMatch(config, parsed.moves);

  return {
    config,
    rejected: false,
    judge: {
      status: simulationResult.status,
      reason: simulationResult.reason,
      parsedMoves: simulationResult.parsedMoves,
      executedMoves: simulationResult.executedMoves,
      wins: simulationResult.wins,
      losses: simulationResult.losses,
      draws: simulationResult.draws,
    },
    simulation: buildRockPaperScissorsSimulationFromResult(config, simulationResult),
  };
}

module.exports = {
  buildRockPaperScissorsExecutionResult,
};
