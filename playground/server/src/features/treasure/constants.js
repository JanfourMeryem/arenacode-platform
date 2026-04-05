'use strict';

const TREASURE_MOVE_CODE_TO_LANE_NAME = Object.freeze({
  1: 'left',
  2: 'center',
  3: 'right',
});

const TREASURE_MOVE_CODE_TO_LABEL = Object.freeze({
  1: 'LEFT',
  2: 'CENTER',
  3: 'RIGHT',
});

const TREASURE_MOVE_CODE_TO_INDEX = Object.freeze({
  1: 0,
  2: 1,
  3: 2,
});

const TREASURE_ALLOWED_MOVE_CODES = Object.freeze(['1', '2', '3']);

const DEFAULT_TREASURE_GENERATION_CONFIG = Object.freeze({
  minSteps: 10,
  maxSteps: 16,
  minCoinsPerLane: 0,
  maxCoinsPerLane: 8,
  minCoinsPerRow: 1,
  emptyLaneChance: 0.18,
  tickDurationMs: 900,
});

module.exports = {
  TREASURE_MOVE_CODE_TO_LANE_NAME,
  TREASURE_MOVE_CODE_TO_LABEL,
  TREASURE_MOVE_CODE_TO_INDEX,
  TREASURE_ALLOWED_MOVE_CODES,
  DEFAULT_TREASURE_GENERATION_CONFIG,
};

