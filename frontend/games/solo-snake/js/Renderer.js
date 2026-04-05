// ============================================
// RENDERER
// Canvas drawing for solo snake
// ============================================

export class Renderer {
  constructor(canvas, settings = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = {
      cellSize: settings.cellSize || 32,
      showGridLines: settings.showGridLines !== false,
      showGlow: settings.showGlow !== false,
      smoothAnimation: settings.smoothAnimation !== false
    };
    this.animationProgress = 0;
    this.previousState = null;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  resize(grid) {
    const width = grid.width * this.settings.cellSize;
    const height = grid.height * this.settings.cellSize;

    this.canvas.width = width;
    this.canvas.height = height;
    // Keep intrinsic canvas size; let CSS constrain visual size inside the card.
    this.canvas.style.width = '';
    this.canvas.style.height = '';
  }

  render(state, animationProgress = 1) {
    this.animationProgress = animationProgress;
    const { grid, snake, isGameOver, gameResult } = state;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.settings.showGridLines) {
      this.drawGrid(grid);
    }

    this.drawSnake(snake, this.previousState?.snake);

    if (isGameOver && gameResult) {
      this.drawGameOverEffects(snake, gameResult);
    }

    this.previousState = JSON.parse(JSON.stringify(state));
  }

  drawGrid(grid) {
    const { cellSize } = this.settings;
    const width = grid.width * cellSize;
    const height = grid.height * cellSize;

    this.ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--grid-line').trim();
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= grid.width; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * cellSize, 0);
      this.ctx.lineTo(x * cellSize, height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= grid.height; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * cellSize);
      this.ctx.lineTo(width, y * cellSize);
      this.ctx.stroke();
    }
  }

  drawSnake(snake, previousSnake) {
    if (!snake) return;

    const { cellSize, showGlow, smoothAnimation } = this.settings;
    const positions = snake.positions;

    positions.forEach((pos, index) => {
      const isHead = index === positions.length - 1;
      let x = pos.x * cellSize;
      let y = pos.y * cellSize;

      if (smoothAnimation && previousSnake && isHead && previousSnake.positions.length > 0) {
        const prevHead = previousSnake.positions[previousSnake.positions.length - 1];
        const dx = (pos.x - prevHead.x) * cellSize * this.animationProgress;
        const dy = (pos.y - prevHead.y) * cellSize * this.animationProgress;
        x = prevHead.x * cellSize + dx;
        y = prevHead.y * cellSize + dy;
      }

      if (showGlow && isHead) {
        const glowSize = cellSize * 1.4;
        const gradient = this.ctx.createRadialGradient(
          x + cellSize / 2, y + cellSize / 2, 0,
          x + cellSize / 2, y + cellSize / 2, glowSize
        );
        gradient.addColorStop(0, this.hexToRgba(snake.color.glow, 0.35));
        gradient.addColorStop(1, this.hexToRgba(snake.color.glow, 0));

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
          x - cellSize / 2,
          y - cellSize / 2,
          cellSize * 2,
          cellSize * 2
        );
      }

      const color = isHead ? snake.color.head : snake.color.body;
      const size = isHead ? cellSize * 0.92 : cellSize * 0.88;
      const offset = (cellSize - size) / 2;

      if (!isHead) {
        this.ctx.strokeStyle = snake.color.head;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
          x + offset,
          y + offset,
          size,
          size
        );
      }

      this.ctx.fillStyle = color;
      this.ctx.fillRect(
        x + offset,
        y + offset,
        size,
        size
      );

      if (isHead) {
        this.drawEyes(x, y, cellSize, snake.direction);
        this.drawHeadHighlight(x, y, cellSize);
      }
    });
  }

  drawEyes(x, y, cellSize, direction) {
    this.ctx.fillStyle = '#ffffff';
    const eyeSize = cellSize * 0.15;
    const eyeOffset = cellSize * 0.3;

    if (direction.x !== 0) {
      const eyeX = x + cellSize / 2 + (direction.x * eyeOffset);
      this.ctx.fillRect(eyeX - eyeSize / 2, y + cellSize * 0.35, eyeSize, eyeSize);
      this.ctx.fillRect(eyeX - eyeSize / 2, y + cellSize * 0.65, eyeSize, eyeSize);
    } else {
      const eyeY = y + cellSize / 2 + (direction.y * eyeOffset);
      this.ctx.fillRect(x + cellSize * 0.35, eyeY - eyeSize / 2, eyeSize, eyeSize);
      this.ctx.fillRect(x + cellSize * 0.65, eyeY - eyeSize / 2, eyeSize, eyeSize);
    }
  }

  drawHeadHighlight(x, y, cellSize) {
    const gradient = this.ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, cellSize, cellSize);
  }

  drawGameOverEffects(snake, gameResult) {
    const { cellSize } = this.settings;
    const head = snake.positions[snake.positions.length - 1];
    const centerX = head.x * cellSize + cellSize / 2;
    const centerY = head.y * cellSize + cellSize / 2;

    if (gameResult.outcome === 'success') {
      snake.positions.forEach(pos => {
        const x = pos.x * cellSize;
        const y = pos.y * cellSize;
        const gradient = this.ctx.createRadialGradient(
          x + cellSize / 2, y + cellSize / 2, 0,
          x + cellSize / 2, y + cellSize / 2, cellSize * 1.2
        );
        gradient.addColorStop(0, this.hexToRgba(snake.color.glow, 0.35));
        gradient.addColorStop(1, this.hexToRgba(snake.color.glow, 0));
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
          x - cellSize * 0.2,
          y - cellSize * 0.2,
          cellSize * 1.4,
          cellSize * 1.4
        );
      });

      for (let i = 0; i < 3; i++) {
        const radius = cellSize * (2 + i * 1.4);
        this.ctx.strokeStyle = this.hexToRgba(snake.color.glow, 0.25 - i * 0.06);
        this.ctx.lineWidth = 4 - i;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    } else {
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, cellSize * 0.3,
        centerX, centerY, cellSize * 3
      );
      gradient.addColorStop(0, 'rgba(255, 80, 80, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 80, 80, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, cellSize * 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
      this.ctx.lineWidth = 6;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, cellSize * 2.2, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  reset() {
    this.previousState = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
