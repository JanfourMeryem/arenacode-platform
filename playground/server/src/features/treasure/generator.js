'use strict';

const {
  DEFAULT_TREASURE_GENERATION_CONFIG,
  TREASURE_MOVE_CODE_TO_LANE_NAME,
} = require('./constants');

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sumCoinRow(row) {
  return row.left + row.center + row.right;
}

function buildRandomCoinRow(settings) {
  const spotlightCode = randomInteger(1, 3);
  const row = { left: 0, center: 0, right: 0 };

  for (let code = 1; code <= 3; code += 1) {
    const laneName = TREASURE_MOVE_CODE_TO_LANE_NAME[code];
    const base = randomInteger(settings.minCoinsPerLane, settings.maxCoinsPerLane);
    const spotlightBonus = code === spotlightCode ? randomInteger(0, 3) : 0;
    const sparsePenalty = Math.random() < 0.25 ? randomInteger(0, 2) : 0;

    let coins = base + spotlightBonus - sparsePenalty;
    coins = clamp(coins, settings.minCoinsPerLane, settings.maxCoinsPerLane);

    if (Math.random() < settings.emptyLaneChance) {
      coins = 0;
    }

    row[laneName] = coins;
  }

  if (sumCoinRow(row) < settings.minCoinsPerRow) {
    const rescueLane = TREASURE_MOVE_CODE_TO_LANE_NAME[randomInteger(1, 3)];
    row[rescueLane] = randomInteger(1, settings.maxCoinsPerLane);
  }

  return row;
}

function generateRandomTreasureConfig() {
  const settings = DEFAULT_TREASURE_GENERATION_CONFIG;
  const length = randomInteger(settings.minSteps, settings.maxSteps);
  const startLaneCode = randomInteger(1, 3);
  const coinRows = [];

  for (let step = 0; step < length; step += 1) {
    coinRows.push(buildRandomCoinRow(settings));
  }

  const totalCoins = coinRows.reduce((acc, row) => acc + sumCoinRow(row), 0);
  const optimalCoins = coinRows.reduce(
    (acc, row) => acc + Math.max(row.left, row.center, row.right),
    0
  );

  return {
    lanes: ['left', 'center', 'right'],
    length,
    startLaneCode,
    startLaneName: TREASURE_MOVE_CODE_TO_LANE_NAME[startLaneCode],
    coinRows,
    tickDurationMs: settings.tickDurationMs,
    totalCoins,
    optimalCoins,
  };
}

module.exports = {
  generateRandomTreasureConfig,
};

