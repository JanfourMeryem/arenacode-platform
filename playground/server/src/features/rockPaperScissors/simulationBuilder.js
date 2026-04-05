'use strict';

function buildRockPaperScissorsSimulationFromResult(config, simulationResult) {
  const rounds = Array.isArray(simulationResult.rounds)
    ? simulationResult.rounds.map((round, index) => ({
      t: Number.isInteger(round.t) ? round.t : index,
      round: Number.isInteger(round.round) ? round.round : index + 1,
      userMoveCode: round.userMoveCode,
      userMove: round.userMove,
      botMoveCode: round.botMoveCode,
      botMove: round.botMove,
      outcome: round.outcome,
    }))
    : [];

  const outcome = simulationResult.status === 'success'
    ? 'success'
    : (simulationResult.status === 'defeat' ? 'defeat' : 'draw');

  return {
    metadata: {
      title: 'Generated Rock Paper Scissors Match',
      description: 'Simulation generated from user output against the built-in bot.',
      date: new Date().toISOString().slice(0, 10),
      version: '1.0',
    },
    meta: {
      rounds: config.rounds,
      tickDurationMs: config.tickDurationMs,
    },
    players: {
      user: {
        name: 'Code Runner',
      },
      bot: {
        name: 'Arena Bot',
      },
    },
    rounds,
    result: {
      outcome,
      reason: simulationResult.reason,
      finalRound: rounds.length,
      wins: simulationResult.wins,
      losses: simulationResult.losses,
      draws: simulationResult.draws,
    },
  };
}

module.exports = {
  buildRockPaperScissorsSimulationFromResult,
};
