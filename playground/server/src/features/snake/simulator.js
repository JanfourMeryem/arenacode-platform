'use strict';

const { SNAKE_DIRECTION_TO_DELTA } = require('./constants');

function simulateSnakeTrail(config, directions) {
  const width = config.grid.width;
  const height = config.grid.height;
  const position = { ...config.startPosition };
  const visited = new Set([`${position.x},${position.y}`]);
  const replayDirections = [];

  let status = 'success';
  let reason = `Completed ${directions.length} moves without collision.`;
  let failedTurn = null;

  for (let index = 0; index < directions.length; index += 1) {
    const direction = directions[index];
    const delta = SNAKE_DIRECTION_TO_DELTA[direction];
    if (!delta) continue;

    replayDirections.push(direction);
    const next = {
      x: position.x + delta.x,
      y: position.y + delta.y,
    };
    const turn = index + 1;

    if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height) {
      status = 'out_of_bounds';
      reason = `Move ${turn} (${direction}) leaves the grid.`;
      failedTurn = turn;
      break;
    }

    const visitKey = `${next.x},${next.y}`;
    if (visited.has(visitKey)) {
      status = 'revisited_cell';
      reason = `Move ${turn} (${direction}) revisits a forbidden cell.`;
      failedTurn = turn;
      break;
    }

    visited.add(visitKey);
    position.x = next.x;
    position.y = next.y;
  }

  return {
    status,
    reason,
    failedTurn,
    replayDirections,
    finalPosition: { ...position },
    visitedCount: visited.size,
  };
}

module.exports = {
  simulateSnakeTrail,
};

