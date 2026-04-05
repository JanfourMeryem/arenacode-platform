'use strict';

const { LABYRINTH_DIRECTION_TO_DELTA } = require('./constants');

function toCellKey(x, y) {
  return `${x},${y}`;
}

function simulateLabyrinthRun(config, directions) {
  const width = config.grid.width;
  const height = config.grid.height;
  const walls = new Set(config.walls.map((wall) => toCellKey(wall.x, wall.y)));

  const maxMoves = Math.max(20, Number.isInteger(config.maxMoves) ? config.maxMoves : width * height * 2);
  const position = {
    x: config.startPosition.x,
    y: config.startPosition.y,
  };

  const visited = new Set([toCellKey(position.x, position.y)]);
  const steps = [{ t: 0, move: 'START' }];

  let status = 'no_exit';
  let reason = 'Path ended before reaching the exit.';
  let failedStep = null;

  const loopCount = Math.min(directions.length, maxMoves);

  for (let index = 0; index < loopCount; index += 1) {
    const direction = directions[index];
    const delta = LABYRINTH_DIRECTION_TO_DELTA[direction];
    if (!delta) continue;

    const next = {
      x: position.x + delta.x,
      y: position.y + delta.y,
    };
    const stepNumber = index + 1;

    if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height) {
      status = 'out_of_bounds';
      reason = `Move ${stepNumber} (${direction}) leaves the maze bounds.`;
      failedStep = stepNumber;
      break;
    }

    steps.push({ t: stepNumber, move: direction });
    position.x = next.x;
    position.y = next.y;

    const key = toCellKey(position.x, position.y);
    visited.add(key);

    if (walls.has(key)) {
      status = 'wall_collision';
      reason = `Move ${stepNumber} (${direction}) hits a wall.`;
      failedStep = stepNumber;
      break;
    }

    if (position.x === config.exitPosition.x && position.y === config.exitPosition.y) {
      status = 'success';
      reason = `Reached the exit in ${stepNumber} moves.`;
      failedStep = null;
      break;
    }
  }

  if (status === 'no_exit') {
    if (directions.length > maxMoves) {
      status = 'step_limit_reached';
      reason = `Step limit reached (${maxMoves} moves).`;
    } else {
      reason = 'Path ended before reaching the exit.';
    }
  }

  return {
    status,
    reason,
    failedStep,
    parsedMoves: directions.length,
    executedMoves: Math.max(steps.length - 1, 0),
    finalPosition: { x: position.x, y: position.y },
    visitedCount: visited.size,
    steps,
  };
}

module.exports = {
  simulateLabyrinthRun,
};
