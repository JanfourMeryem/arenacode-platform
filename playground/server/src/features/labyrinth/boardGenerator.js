'use strict';

const { DEFAULT_LABYRINTH_GENERATION_CONFIG } = require('./constants');

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toCellKey(x, y) {
  return `${x},${y}`;
}

function fromCellKey(key) {
  const [xText, yText] = String(key).split(',');
  return { x: Number(xText), y: Number(yText) };
}

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickRandomCell(width, height) {
  return {
    x: randomInteger(0, width - 1),
    y: randomInteger(0, height - 1),
  };
}

function hasPath(width, height, start, exit, wallSet) {
  const startKey = toCellKey(start.x, start.y);
  const targetKey = toCellKey(exit.x, exit.y);
  const queue = [startKey];
  const visited = new Set([startKey]);

  while (queue.length) {
    const currentKey = queue.shift();
    if (currentKey === targetKey) return true;

    const current = fromCellKey(currentKey);
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const next of neighbors) {
      if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height) continue;
      const nextKey = toCellKey(next.x, next.y);
      if (wallSet.has(nextKey) || visited.has(nextKey)) continue;
      visited.add(nextKey);
      queue.push(nextKey);
    }
  }

  return false;
}

function buildGridRows(width, height, start, exit, walls) {
  const wallSet = new Set(walls.map((wall) => toCellKey(wall.x, wall.y)));
  const rows = [];

  for (let y = 0; y < height; y += 1) {
    let row = '';
    for (let x = 0; x < width; x += 1) {
      if (x === start.x && y === start.y) {
        row += 'S';
      } else if (x === exit.x && y === exit.y) {
        row += 'E';
      } else if (wallSet.has(toCellKey(x, y))) {
        row += '#';
      } else {
        row += '.';
      }
    }
    rows.push(row);
  }

  return rows;
}

function sortWalls(walls) {
  return [...walls].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
}

function createFallbackLabyrinthConfig() {
  const width = 14;
  const height = 10;
  const start = { x: 1, y: 1 };
  const exit = { x: 12, y: 8 };
  const walls = [];

  // Border walls with an intentional corridor inside.
  for (let x = 0; x < width; x += 1) {
    if (!(x === start.x && 0 === start.y)) walls.push({ x, y: 0 });
    if (!(x === exit.x && height - 1 === exit.y)) walls.push({ x, y: height - 1 });
  }
  for (let y = 1; y < height - 1; y += 1) {
    walls.push({ x: 0, y });
    walls.push({ x: width - 1, y });
  }

  for (let y = 2; y < height - 2; y += 1) {
    if (y === 5) continue;
    walls.push({ x: 4, y });
  }
  for (let x = 5; x < width - 2; x += 1) {
    if (x === 9) continue;
    walls.push({ x, y: 6 });
  }

  const wallSet = new Set(walls.map((wall) => toCellKey(wall.x, wall.y)));
  wallSet.delete(toCellKey(start.x, start.y));
  wallSet.delete(toCellKey(exit.x, exit.y));

  const normalizedWalls = sortWalls([...wallSet].map(fromCellKey));

  return {
    grid: { width, height },
    startPosition: start,
    exitPosition: exit,
    walls: normalizedWalls,
    tickDurationMs: DEFAULT_LABYRINTH_GENERATION_CONFIG.tickDurationMs,
    maxMoves: width * height * DEFAULT_LABYRINTH_GENERATION_CONFIG.maxMovesMultiplier,
  };
}

function generateRandomLabyrinthConfig() {
  const settings = DEFAULT_LABYRINTH_GENERATION_CONFIG;

  for (let attempt = 0; attempt < settings.maxGenerationAttempts; attempt += 1) {
    const width = randomInteger(settings.minWidth, settings.maxWidth);
    const height = randomInteger(settings.minHeight, settings.maxHeight);

    const start = pickRandomCell(width, height);

    let exit = pickRandomCell(width, height);
    let guard = 0;
    while (
      (exit.x === start.x && exit.y === start.y) ||
      manhattanDistance(start, exit) < settings.minDistanceFromStartToExit
    ) {
      exit = pickRandomCell(width, height);
      guard += 1;
      if (guard > 120) break;
    }

    const wallDensity = Math.random() * (settings.maxWallDensity - settings.minWallDensity) + settings.minWallDensity;
    const targetWallCount = Math.floor(width * height * wallDensity);
    const wallSet = new Set();

    let rollCount = 0;
    while (wallSet.size < targetWallCount && rollCount < width * height * 8) {
      const point = pickRandomCell(width, height);
      const key = toCellKey(point.x, point.y);
      const isStart = point.x === start.x && point.y === start.y;
      const isExit = point.x === exit.x && point.y === exit.y;

      if (!isStart && !isExit) {
        wallSet.add(key);
      }

      rollCount += 1;
    }

    if (!hasPath(width, height, start, exit, wallSet)) {
      continue;
    }

    const walls = sortWalls([...wallSet].map(fromCellKey));

    return {
      grid: { width, height },
      startPosition: start,
      exitPosition: exit,
      walls,
      tickDurationMs: settings.tickDurationMs,
      maxMoves: width * height * settings.maxMovesMultiplier,
    };
  }

  return createFallbackLabyrinthConfig();
}

module.exports = {
  generateRandomLabyrinthConfig,
  buildGridRows,
};
