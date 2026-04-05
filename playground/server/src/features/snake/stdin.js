'use strict';

const lastSnakeStartByGrid = new Map();

function generateRandomInteger(min, max) {
  const safeMin = Number.isInteger(min) ? min : 0;
  const safeMax = Number.isInteger(max) ? max : 100;
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function generateRandomSnakeStartPosition(grid) {
  const width = grid.width;
  const height = grid.height;
  const totalCells = width * height;
  const key = `${width}x${height}`;
  const previousIndex = lastSnakeStartByGrid.get(key);

  let nextIndex = generateRandomInteger(0, totalCells - 1);
  if (
    Number.isInteger(previousIndex) &&
    totalCells > 1 &&
    nextIndex === previousIndex
  ) {
    const offset = generateRandomInteger(1, totalCells - 1);
    nextIndex = (nextIndex + offset) % totalCells;
  }

  lastSnakeStartByGrid.set(key, nextIndex);
  return {
    x: nextIndex % width,
    y: Math.floor(nextIndex / width),
  };
}

function withRandomSnakeStart(config) {
  const randomStart = generateRandomSnakeStartPosition(config.grid);
  return {
    ...config,
    grid: {
      width: config.grid.width,
      height: config.grid.height,
    },
    startPosition: {
      x: randomStart.x,
      y: randomStart.y,
    },
    player: {
      ...config.player,
      color: {
        ...config.player.color,
      },
    },
  };
}

function buildSnakeStdinContract(config) {
  return [
    `${config.grid.width} ${config.grid.height}`,
    `${config.startPosition.x} ${config.startPosition.y}`,
  ].join('\n') + '\n';
}

module.exports = {
  buildSnakeStdinContract,
  generateRandomSnakeStartPosition,
  withRandomSnakeStart,
};

