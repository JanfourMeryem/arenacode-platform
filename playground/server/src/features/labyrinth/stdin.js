'use strict';

function buildLabyrinthStdinContract(config) {
  const lines = [
    `${config.grid.width} ${config.grid.height}`,
    `${config.startPosition.x} ${config.startPosition.y}`,
    `${config.exitPosition.x} ${config.exitPosition.y}`,
    `${config.walls.length}`,
  ];

  for (const wall of config.walls) {
    lines.push(`${wall.x} ${wall.y}`);
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  buildLabyrinthStdinContract,
};
