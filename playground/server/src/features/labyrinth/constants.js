'use strict';

const LABYRINTH_MOVE_TOKEN_TO_DIRECTION = Object.freeze({
  '1': 'UP',
  '2': 'DOWN',
  '3': 'RIGHT',
  '4': 'LEFT',
  UP: 'UP',
  U: 'UP',
  DOWN: 'DOWN',
  D: 'DOWN',
  RIGHT: 'RIGHT',
  R: 'RIGHT',
  LEFT: 'LEFT',
  L: 'LEFT',
});

const LABYRINTH_DIRECTION_TO_DELTA = Object.freeze({
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  RIGHT: { x: 1, y: 0 },
  LEFT: { x: -1, y: 0 },
});

const DEFAULT_LABYRINTH_GENERATION_CONFIG = Object.freeze({
  minWidth: 12,
  maxWidth: 20,
  minHeight: 8,
  maxHeight: 14,
  minWallDensity: 0.16,
  maxWallDensity: 0.32,
  minDistanceFromStartToExit: 6,
  maxGenerationAttempts: 40,
  tickDurationMs: 650,
  maxMovesMultiplier: 2,
});

module.exports = {
  LABYRINTH_MOVE_TOKEN_TO_DIRECTION,
  LABYRINTH_DIRECTION_TO_DELTA,
  DEFAULT_LABYRINTH_GENERATION_CONFIG,
};
