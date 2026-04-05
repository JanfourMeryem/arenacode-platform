'use strict';

function buildSnakeSimulationFromResult(config, replayDirections, result) {
  const moves = replayDirections.map((direction, index) => ({
    turn: index + 1,
    direction,
  }));

  const outcome = result.status === 'success' ? 'success' : 'fail';
  return {
    metadata: {
      title: 'Generated Snake Run',
      description: 'Simulation generated from user code output.',
      date: new Date().toISOString().slice(0, 10),
      version: '1.0',
    },
    grid: {
      width: config.grid.width,
      height: config.grid.height,
    },
    player: {
      name: config.player.name,
      color: {
        head: config.player.color.head,
        body: config.player.color.body,
        glow: config.player.color.glow,
      },
      startPosition: {
        x: config.startPosition.x,
        y: config.startPosition.y,
      },
      startDirection: config.startDirection,
      initialLength: 1,
    },
    moves,
    result: {
      outcome,
      reason: result.reason,
      finalTurn: moves.length,
    },
    foods: [],
  };
}

module.exports = {
  buildSnakeSimulationFromResult,
};

