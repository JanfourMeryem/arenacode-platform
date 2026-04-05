'use strict';

const { buildGridRows } = require('./boardGenerator');

function buildLabyrinthSimulationFromResult(config, simulationResult) {
  const steps = Array.isArray(simulationResult.steps)
    ? simulationResult.steps.map((step, index) => ({
      t: Number.isInteger(step.t) ? step.t : index,
      move: step.move || 'START',
    }))
    : [{ t: 0, move: 'START' }];

  const outcome = simulationResult.status === 'success' ? 'success' : 'fail';

  return {
    metadata: {
      title: 'Generated Labyrinth Run',
      description: 'Simulation generated from user output.',
      date: new Date().toISOString().slice(0, 10),
      version: '1.0',
    },
    meta: {
      rows: config.grid.height,
      cols: config.grid.width,
      tickDurationMs: config.tickDurationMs,
      allowWallCollision: true,
    },
    grid: buildGridRows(
      config.grid.width,
      config.grid.height,
      config.startPosition,
      config.exitPosition,
      config.walls
    ),
    steps,
    result: {
      outcome,
      reason: simulationResult.reason,
      finalStep: Math.max(steps.length - 1, 0),
    },
  };
}

module.exports = {
  buildLabyrinthSimulationFromResult,
};
