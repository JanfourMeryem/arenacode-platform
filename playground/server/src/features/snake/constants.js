'use strict';

const SNAKE_MOVE_CODE_TO_DIRECTION = Object.freeze({
  '1': 'UP',
  '2': 'DOWN',
  '3': 'RIGHT',
  '4': 'LEFT',
});

const SNAKE_DIRECTION_TO_DELTA = Object.freeze({
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  RIGHT: { x: 1, y: 0 },
  LEFT: { x: -1, y: 0 },
});

const DEFAULT_SNAKE_EXECUTION_CONFIG = Object.freeze({
  grid: { width: 30, height: 18 },
  startPosition: { x: 5, y: 7 },
  startDirection: 'RIGHT',
  player: {
    name: 'Code Runner',
    color: {
      head: '#7ff8ff',
      body: '#0d4a5a',
      glow: '#30e4ff',
    },
    initialLength: 1,
  },
});

module.exports = {
  SNAKE_MOVE_CODE_TO_DIRECTION,
  SNAKE_DIRECTION_TO_DELTA,
  DEFAULT_SNAKE_EXECUTION_CONFIG,
};

