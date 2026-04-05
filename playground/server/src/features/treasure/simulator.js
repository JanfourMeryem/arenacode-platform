'use strict';

const {
  TREASURE_MOVE_CODE_TO_INDEX,
  TREASURE_MOVE_CODE_TO_LABEL,
  TREASURE_MOVE_CODE_TO_LANE_NAME,
} = require('./constants');

function normalizeCoinRow(row) {
  return {
    left: Number.isInteger(row?.left) && row.left >= 0 ? row.left : 0,
    center: Number.isInteger(row?.center) && row.center >= 0 ? row.center : 0,
    right: Number.isInteger(row?.right) && row.right >= 0 ? row.right : 0,
  };
}

function sumCoinRow(row) {
  return row.left + row.center + row.right;
}

function simulateTreasureRun(config, moves) {
  const normalizedRows = config.coinRows.map((row) => normalizeCoinRow(row));
  const startLaneCode = Number.isInteger(config.startLaneCode) ? config.startLaneCode : 2;
  let currentLaneCode = startLaneCode;

  const steps = [];
  let collectedCoins = 0;
  let totalCoins = 0;
  let optimalCoins = 0;
  let missedCoins = 0;
  let perfectSteps = 0;

  for (let stepIndex = 0; stepIndex < config.length; stepIndex += 1) {
    const row = normalizedRows[stepIndex] || { left: 0, center: 0, right: 0 };
    const selectedCode = moves[stepIndex];
    const fromLaneCode = currentLaneCode;
    const toLaneCode = selectedCode;
    const toLaneName = TREASURE_MOVE_CODE_TO_LANE_NAME[toLaneCode];

    const rowTotal = sumCoinRow(row);
    const rowBest = Math.max(row.left, row.center, row.right);
    const gainedCoins = row[toLaneName];

    collectedCoins += gainedCoins;
    totalCoins += rowTotal;
    optimalCoins += rowBest;
    missedCoins += (rowTotal - gainedCoins);

    if (gainedCoins === rowBest) {
      perfectSteps += 1;
    }

    steps.push({
      t: stepIndex,
      code: toLaneCode,
      move: TREASURE_MOVE_CODE_TO_LABEL[toLaneCode],
      fromLane: TREASURE_MOVE_CODE_TO_INDEX[fromLaneCode],
      toLane: TREASURE_MOVE_CODE_TO_INDEX[toLaneCode],
      coins: row,
    });

    currentLaneCode = toLaneCode;
  }

  const status = collectedCoins === optimalCoins ? 'success' : 'partial';
  const percentage = optimalCoins > 0 ? Math.round((collectedCoins / optimalCoins) * 100) : 100;
  const reason = status === 'success'
    ? `Perfect run: collected all ${optimalCoins} optimal coin(s).`
    : `Collected ${collectedCoins}/${optimalCoins} optimal coin(s) (${percentage}%).`;

  return {
    status,
    reason,
    parsedMoves: moves.length,
    executedMoves: steps.length,
    finalLaneCode: currentLaneCode,
    finalLane: TREASURE_MOVE_CODE_TO_LANE_NAME[currentLaneCode],
    collectedCoins,
    totalCoins,
    optimalCoins,
    missedCoins,
    perfectSteps,
    steps,
    coinRows: normalizedRows,
  };
}

module.exports = {
  simulateTreasureRun,
};

