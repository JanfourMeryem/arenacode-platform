'use strict';

function buildTreasureSimulationFromResult(config, simulationResult) {
  const steps = Array.isArray(simulationResult.steps)
    ? simulationResult.steps.map((step, index) => ({
      t: Number.isInteger(step.t) ? step.t : index,
      code: step.code,
      move: step.move,
      fromLane: step.fromLane,
      toLane: step.toLane,
      coins: {
        left: step.coins?.left ?? 0,
        center: step.coins?.center ?? 0,
        right: step.coins?.right ?? 0,
      },
    }))
    : [];

  const outcome = simulationResult.status === 'success'
    ? 'success'
    : (simulationResult.status === 'partial' ? 'partial' : 'fail');

  return {
    metadata: {
      title: 'Generated Treasure Run',
      description: 'Simulation generated from user output.',
      date: new Date().toISOString().slice(0, 10),
      version: '1.0',
    },
    meta: {
      title: 'Generated Treasure Run',
      lanes: config.lanes,
      length: config.length,
      startLane: config.startLaneCode,
      tickDurationMs: config.tickDurationMs,
    },
    player: {
      startLane: config.startLaneName,
    },
    coinRows: config.coinRows.map((row) => ({
      left: row.left,
      center: row.center,
      right: row.right,
    })),
    steps,
    result: {
      outcome,
      reason: simulationResult.reason,
      finalStep: Math.max(steps.length - 1, 0),
      collectedCoins: simulationResult.collectedCoins ?? 0,
      missedCoins: simulationResult.missedCoins ?? 0,
      optimalCoins: simulationResult.optimalCoins ?? 0,
      totalCoins: simulationResult.totalCoins ?? 0,
    },
  };
}

module.exports = {
  buildTreasureSimulationFromResult,
};

