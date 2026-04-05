'use strict';

function buildTreasureStdinContract(config) {
  const lines = [
    `${config.length}`,
    `${config.startLaneCode}`,
  ];

  for (const row of config.coinRows) {
    lines.push(`${row.left} ${row.center} ${row.right}`);
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  buildTreasureStdinContract,
};

