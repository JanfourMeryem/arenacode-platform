'use strict';

const { isNonEmptyString } = require('../../utils/helpers');
const {
  DEFAULT_SNAKE_EXECUTION_CONFIG,
  SNAKE_DIRECTION_TO_DELTA,
} = require('./constants');

function toValidInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function sanitizeSnakeColor(value, fallback) {
  if (!isNonEmptyString(value)) return fallback;
  const trimmed = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : fallback;
}

function normalizeSnakeDirection(value, fallback = 'RIGHT') {
  if (!isNonEmptyString(value)) return fallback;
  const upper = value.trim().toUpperCase();
  return upper in SNAKE_DIRECTION_TO_DELTA ? upper : fallback;
}

function cloneDefaultSnakeConfig() {
  return {
    grid: {
      width: DEFAULT_SNAKE_EXECUTION_CONFIG.grid.width,
      height: DEFAULT_SNAKE_EXECUTION_CONFIG.grid.height,
    },
    startPosition: {
      x: DEFAULT_SNAKE_EXECUTION_CONFIG.startPosition.x,
      y: DEFAULT_SNAKE_EXECUTION_CONFIG.startPosition.y,
    },
    startDirection: DEFAULT_SNAKE_EXECUTION_CONFIG.startDirection,
    player: {
      name: DEFAULT_SNAKE_EXECUTION_CONFIG.player.name,
      color: {
        head: DEFAULT_SNAKE_EXECUTION_CONFIG.player.color.head,
        body: DEFAULT_SNAKE_EXECUTION_CONFIG.player.color.body,
        glow: DEFAULT_SNAKE_EXECUTION_CONFIG.player.color.glow,
      },
      initialLength: DEFAULT_SNAKE_EXECUTION_CONFIG.player.initialLength,
    },
  };
}

function resolveSnakeExecutionConfig(rawConfig) {
  const config = cloneDefaultSnakeConfig();

  if (rawConfig && typeof rawConfig === 'object') {
    if (rawConfig.grid && typeof rawConfig.grid === 'object') {
      config.grid.width = toValidInteger(rawConfig.grid.width, config.grid.width);
      config.grid.height = toValidInteger(rawConfig.grid.height, config.grid.height);
    }

    if (rawConfig.startPosition && typeof rawConfig.startPosition === 'object') {
      config.startPosition.x = toValidInteger(rawConfig.startPosition.x, config.startPosition.x);
      config.startPosition.y = toValidInteger(rawConfig.startPosition.y, config.startPosition.y);
    }

    config.startDirection = normalizeSnakeDirection(rawConfig.startDirection, config.startDirection);

    if (rawConfig.player && typeof rawConfig.player === 'object') {
      if (isNonEmptyString(rawConfig.player.name)) {
        config.player.name = rawConfig.player.name.trim().slice(0, 80);
      }
      if (rawConfig.player.color && typeof rawConfig.player.color === 'object') {
        config.player.color.head = sanitizeSnakeColor(
          rawConfig.player.color.head,
          config.player.color.head
        );
        config.player.color.body = sanitizeSnakeColor(
          rawConfig.player.color.body,
          config.player.color.body
        );
        config.player.color.glow = sanitizeSnakeColor(
          rawConfig.player.color.glow,
          config.player.color.glow
        );
      }
    }
  }

  const maxGridSide = 200;
  if (
    !Number.isInteger(config.grid.width) ||
    !Number.isInteger(config.grid.height) ||
    config.grid.width < 2 ||
    config.grid.height < 2 ||
    config.grid.width > maxGridSide ||
    config.grid.height > maxGridSide
  ) {
    return { success: false, error: 'Invalid snake grid dimensions.' };
  }

  config.startPosition.x = Math.max(0, Math.min(config.startPosition.x, config.grid.width - 1));
  config.startPosition.y = Math.max(0, Math.min(config.startPosition.y, config.grid.height - 1));

  // Permanent-trail mode starts with one visited cell.
  config.player.initialLength = 1;

  return { success: true, config };
}

module.exports = {
  resolveSnakeExecutionConfig,
  normalizeSnakeDirection,
  cloneDefaultSnakeConfig,
};

