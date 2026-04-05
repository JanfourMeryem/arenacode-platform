// ============================================
// GAME ENGINE
// Core logic for solo snake replay
// ============================================

export class GameEngine {
  constructor(simulation) {
    this.simulation = simulation;
    this.grid = null;
    this.snake = null;
    this.currentTurn = 0;
    this.isGameOver = false;
    this.gameResult = null;
  }

  initialize() {
    const { grid, player } = this.simulation;

    this.grid = { width: grid.width, height: grid.height };
    this.currentTurn = 0;
    this.isGameOver = false;
    this.gameResult = null;

    this.snake = this.createSnake(player);
  }

  createSnake(config) {
    const snake = {
      name: config.name,
      color: config.color,
      positions: [],
      direction: { ...(config.startDir || { x: 1, y: 0 }) },
      isAlive: true,
      length: config.initialLength || 3
    };

    const { x, y } = config.startPosition;
    const dir = config.startDir || { x: 1, y: 0 };

    // Build initial body from tail to head so the last element is the head
    for (let i = snake.length - 1; i >= 0; i--) {
      snake.positions.push({
        x: x - dir.x * i,
        y: y - dir.y * i
      });
    }

    return snake;
  }

  step() {
    if (this.isGameOver) return false;

    // No more scripted moves
    if (this.currentTurn >= this.simulation.moves.length) {
      this.finalizeFromScript();
      return false;
    }

    const move = this.simulation.moves[this.currentTurn];
    if (move.direction) {
      this.snake.direction = { ...move.direction };
    }

    const head = this.snake.positions[this.snake.positions.length - 1];
    const nextHead = {
      x: head.x + this.snake.direction.x,
      y: head.y + this.snake.direction.y
    };

    const collisionReason = this.getCollisionReason(nextHead);
    if (collisionReason) {
      this.snake.isAlive = false;
      this.endGame('fail', collisionReason);
      return false;
    }

    this.snake.positions.push(nextHead);
    this.snake.length += 1; // grow every step

    this.currentTurn += 1;

    if (this.currentTurn >= this.simulation.moves.length) {
      this.endGame('success', this.simulation.result?.reason || 'Completed path without collision');
      return false;
    }

    return true;
  }

  getCollisionReason(nextHead) {
    if (!this.isInBounds(nextHead.x, nextHead.y)) {
      return 'Hit the wall';
    }

    const collidedWithBody = this.snake.positions.some(pos => pos.x === nextHead.x && pos.y === nextHead.y);
    if (collidedWithBody) {
      return 'Crossed its own path';
    }

    return null;
  }

  isInBounds(x, y) {
    return x >= 0 && x < this.grid.width && y >= 0 && y < this.grid.height;
  }

  finalizeFromScript() {
    if (this.isGameOver) return;
    const scriptedResult = this.simulation.result;
    const outcome = scriptedResult?.outcome || 'success';
    const reason = scriptedResult?.reason || (outcome === 'success' ? 'Completed path' : 'Script ended');
    this.endGame(outcome, reason);
  }

  endGame(outcome, reason) {
    this.isGameOver = true;
    this.gameResult = {
      outcome,
      reason,
      finalTurn: this.currentTurn
    };
  }

  reset() {
    this.initialize();
  }

  getState() {
    return {
      snake: this.snake,
      grid: this.grid,
      currentTurn: this.currentTurn,
      isGameOver: this.isGameOver,
      gameResult: this.gameResult
    };
  }
}
