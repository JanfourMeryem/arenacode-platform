/*
   Snake challenge config provider
   Reads current simulation context from parent (solo-snake) when embedded.
*/

const DEFAULT_SNAKE_CONFIG = Object.freeze({
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

const ALLOWED_DIRECTIONS = new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']);

function toValidInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function cloneDefaultSnakeConfig() {
  return {
    grid: {
      width: DEFAULT_SNAKE_CONFIG.grid.width,
      height: DEFAULT_SNAKE_CONFIG.grid.height,
    },
    startPosition: {
      x: DEFAULT_SNAKE_CONFIG.startPosition.x,
      y: DEFAULT_SNAKE_CONFIG.startPosition.y,
    },
    startDirection: DEFAULT_SNAKE_CONFIG.startDirection,
    player: {
      name: DEFAULT_SNAKE_CONFIG.player.name,
      color: {
        head: DEFAULT_SNAKE_CONFIG.player.color.head,
        body: DEFAULT_SNAKE_CONFIG.player.color.body,
        glow: DEFAULT_SNAKE_CONFIG.player.color.glow,
      },
      initialLength: 1,
    },
  };
}

function normalizeDirection(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const direction = value.trim().toUpperCase();
  return ALLOWED_DIRECTIONS.has(direction) ? direction : fallback;
}

export function resolveSnakeConfigFromParent(windowRef = window) {
  const fallback = cloneDefaultSnakeConfig();

  try {
    const parentWindow = windowRef.parent;
    if (!parentWindow || parentWindow === windowRef) return fallback;

    const parentApp = parentWindow.soloSnakeApp;
    const simulation = parentApp?.currentSimulation;
    if (!simulation || typeof simulation !== 'object') return fallback;

    const width = Math.max(2, toValidInteger(simulation?.grid?.width, fallback.grid.width));
    const height = Math.max(2, toValidInteger(simulation?.grid?.height, fallback.grid.height));
    const startX = toValidInteger(simulation?.player?.startPosition?.x, fallback.startPosition.x);
    const startY = toValidInteger(simulation?.player?.startPosition?.y, fallback.startPosition.y);
    const startDirection = normalizeDirection(simulation?.player?.startDirection, fallback.startDirection);
    const name = typeof simulation?.player?.name === 'string' && simulation.player.name.trim()
      ? simulation.player.name.trim()
      : fallback.player.name;

    return {
      grid: { width, height },
      startPosition: { x: startX, y: startY },
      startDirection,
      player: {
        name,
        color: {
          head: simulation?.player?.color?.head || fallback.player.color.head,
          body: simulation?.player?.color?.body || fallback.player.color.body,
          glow: simulation?.player?.color?.glow || fallback.player.color.glow,
        },
        initialLength: 1,
      },
    };
  } catch {
    return fallback;
  }
}

