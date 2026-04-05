const MOVE_TO_DELTA = Object.freeze({
  UP: { row: -1, col: 0 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
  RIGHT: { row: 0, col: 1 },
});

const MOVE_ALIASES = Object.freeze({
  UP: 'UP',
  U: 'UP',
  '1': 'UP',
  DOWN: 'DOWN',
  D: 'DOWN',
  '2': 'DOWN',
  RIGHT: 'RIGHT',
  R: 'RIGHT',
  '3': 'RIGHT',
  LEFT: 'LEFT',
  L: 'LEFT',
  '4': 'LEFT',
  START: 'START',
});

const t = (key, fallback = '') => {
  if (window.ArenaI18n && typeof window.ArenaI18n.t === 'function') {
    return window.ArenaI18n.t(key, fallback);
  }
  return fallback || key;
};

function toNormalizedMove(move) {
  if (typeof move !== 'string') return null;
  const token = move.trim().toUpperCase();
  return MOVE_ALIASES[token] || null;
}

function safeInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class LabyrinthChallengeApp {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.elements = {};

    this.mazeData = null;
    this.currentSimulation = null;
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.animationFrameId = null;
    this.stepStartTime = 0;
    this.speedMultiplier = 1;
    this.baseTickDuration = 700;
    this.lastProgress = 0;
    this.visitedCells = new Set();
    this.gameOutcome = null;

    this.playgroundMessageHandler = null;
  }

  initialize() {
    this.cacheElements();
    if (!this.canvas || !this.ctx) {
      console.error('Labyrinth canvas is missing.');
      return;
    }

    this.bindEvents();
    this.setupPlaygroundBridge();

    this.speedMultiplier = parseFloat(this.elements.speedSlider?.value || '1') || 1;
    this.updateSpeedLabel();
    this.setPlaybackControls('no-simulation');
    this.updateStepCounter();
    this.updateStatus(t('labyrinth.overlay.start_short', 'Write code and press Run to generate a simulation.'), t('common.idle', 'Idle'));
    this.showOverlay(
      t('labyrinth.title', 'Labyrinth Escape'),
      t('labyrinth.overlay.start', 'Write code and press Run to generate a simulation, then press Play to replay it.')
    );

    this.resizeCanvas(14, 20);
    this.drawPlaceholderGrid();

    window.addEventListener('resize', () => {
      if (!this.mazeData) return;
      this.resizeCanvas(this.mazeData.meta.rows, this.mazeData.meta.cols);
      this.renderCurrentFrame();
    });

    window.addEventListener('arena:languagechange', () => {
      this.updateStepCounter();
      this.renderCurrentFrame();
      if (!this.isPlaying && !this.mazeData) {
        this.updateStatus(t('labyrinth.overlay.start_short', 'Write code and press Run to generate a simulation.'), t('common.idle', 'Idle'));
      }
    });

    window.labyrinthApp = this;
  }

  cacheElements() {
    this.canvas = document.getElementById('labyrinthCanvas');
    this.ctx = this.canvas?.getContext('2d');

    this.elements = {
      loadSimulation: document.getElementById('loadSimulation'),
      simulationSelector: document.getElementById('simulationSelector'),
      playButton: document.getElementById('playButton'),
      pauseButton: document.getElementById('pauseButton'),
      resetButton: document.getElementById('resetButton'),
      speedSlider: document.getElementById('speedSlider'),
      speedValue: document.getElementById('speedValue'),
      stepCounter: document.getElementById('stepCounter'),
      stateLabel: document.getElementById('stateLabel'),
      status: document.getElementById('status'),
      overlay: document.getElementById('gameOverlay'),
      overlayTitle: document.getElementById('overlayTitle'),
      overlayMessage: document.getElementById('overlayMessage'),
    };
  }

  bindEvents() {
    this.elements.loadSimulation?.addEventListener('click', () => {
      const path = this.elements.simulationSelector?.value;
      if (path) this.loadSimulation(path);
    });

    this.elements.playButton?.addEventListener('click', () => this.play());
    this.elements.pauseButton?.addEventListener('click', () => this.pause());
    this.elements.resetButton?.addEventListener('click', () => this.reset());

    this.elements.speedSlider?.addEventListener('input', (event) => {
      this.speedMultiplier = parseFloat(event.target.value || '1') || 1;
      this.updateSpeedLabel();
      if (this.isPlaying) this.stepStartTime = performance.now();
    });
  }

  setupPlaygroundBridge() {
    this.playgroundMessageHandler = async (event) => {
      const payload = event?.data;
      if (!payload || typeof payload !== 'object') return;

      if (payload.type === 'labyrinth-simulation-generated') {
        if (!payload.simulation || typeof payload.simulation !== 'object') return;
        try {
          await this.loadGeneratedSimulation(payload.simulation, payload.judge || null);
        } catch (error) {
          console.error(error);
          this.handleChallengeRejection(error.message || t('labyrinth.error.generated_invalid', 'Generated simulation is invalid.'));
        }
      }

      if (payload.type === 'labyrinth-simulation-rejected') {
        const reason = typeof payload.reason === 'string' && payload.reason.trim().length
          ? payload.reason.trim()
          : (payload?.judge?.reason || t('common.submission_rejected', 'Submission rejected by challenge rules.'));
        this.handleChallengeRejection(reason);
      }
    };

    window.addEventListener('message', this.playgroundMessageHandler);
  }

  async loadSimulation(path) {
    this.stopPlayback();
    this.showLoading(t('common.loading', 'Loading...'));

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Unable to load simulation (${response.status})`);
      }
      const data = await response.json();
      await sleep(120);
      this.applySimulation(data, {
        readyTitle: t('labyrinth.overlay.sim_ready', 'Simulation ready'),
        readyMessage: t('labyrinth.overlay.play_replay', 'Press Play to start the replay.'),
        statusMessage: t('labyrinth.status.fallback_loaded', 'Fallback simulation loaded.'),
      });
    } catch (error) {
      console.error(error);
      this.showOverlay(
        t('labyrinth.overlay.load_error_title', 'Unable to load simulation'),
        error.message || t('labyrinth.overlay.load_error_message', 'Unexpected loading error.')
      );
      this.setPlaybackControls('no-simulation');
      this.updateStatus(error.message || t('labyrinth.status.load_error', 'Simulation load error.'), t('common.error', 'Error'));
    }
  }

  async loadGeneratedSimulation(simulation, judge = null) {
    this.stopPlayback();
    this.showLoading(t('labyrinth.overlay.loading_generated', 'Loading generated run...'));
    await sleep(140);

    this.applySimulation(simulation, {
      readyTitle: t('labyrinth.overlay.generated_ready', 'Generated simulation ready'),
      readyMessage: this.resolveJudgeMessage(judge),
      statusMessage: t('labyrinth.status.generated_loaded', 'Generated simulation loaded.'),
    });
  }

  applySimulation(rawSimulation, options = {}) {
    const normalized = this.normalizeSimulation(rawSimulation);

    this.mazeData = normalized;
    this.currentSimulation = rawSimulation;
    this.baseTickDuration = Math.max(120, safeInteger(normalized.meta.tickDurationMs, 700));

    this.currentStepIndex = 0;
    this.lastProgress = 0;
    this.gameOutcome = null;
    this.visitedCells = new Set();

    const firstStep = normalized.steps[0];
    if (firstStep?.player) {
      this.visitedCells.add(`${firstStep.player.row},${firstStep.player.col}`);
    }

    this.resizeCanvas(normalized.meta.rows, normalized.meta.cols);
    this.renderCurrentFrame();
    this.updateStepCounter();
    this.setPlaybackControls('stopped');
    this.updateStatus(options.statusMessage || t('labyrinth.status.sim_loaded', 'Simulation loaded.'), t('common.ready', 'Ready'));

    this.showOverlay(
      options.readyTitle || t('labyrinth.overlay.sim_ready', 'Simulation ready'),
      options.readyMessage || 'Press Play to start replay.'
    );
  }

  normalizeSimulation(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Simulation payload is missing.');
    }

    if (typeof window.validateLabyrinthSimulation === 'function') {
      const validation = window.validateLabyrinthSimulation(data);
      if (!validation.ok) {
        throw new Error(validation.errors.join(' | '));
      }
    }

    const rows = safeInteger(data?.meta?.rows, 0);
    const cols = safeInteger(data?.meta?.cols, 0);
    if (rows <= 0 || cols <= 0) {
      throw new Error('Invalid maze dimensions in simulation metadata.');
    }

    if (!Array.isArray(data.grid) || data.grid.length !== rows) {
      throw new Error('Simulation grid is invalid.');
    }

    const grid = data.grid.map((row) => {
      const normalizedRow = typeof row === 'string' ? row : String(row || '');
      if (normalizedRow.length !== cols) {
        throw new Error('Simulation grid row length does not match metadata.');
      }
      return normalizedRow;
    });

    const steps = this.buildStepsWithPositions(grid, data.steps || []);
    if (!steps.length) {
      throw new Error('Simulation contains no playable steps.');
    }

    return {
      metadata: data.metadata || null,
      meta: {
        rows,
        cols,
        tickDurationMs: safeInteger(data?.meta?.tickDurationMs, 700),
      },
      grid,
      steps,
      result: data?.result && typeof data.result === 'object' ? data.result : null,
    };
  }

  buildStepsWithPositions(grid, steps) {
    if (!Array.isArray(steps) || !steps.length) return [];

    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    let current = this.findStartInGrid(grid);
    if (!current) {
      current = { row: 0, col: 0 };
    }

    const built = [];

    steps.forEach((step, index) => {
      if (step && typeof step === 'object') {
        if (step.player && Number.isInteger(step.player.row) && Number.isInteger(step.player.col)) {
          current = { row: step.player.row, col: step.player.col };
        } else {
          const move = toNormalizedMove(step.move);
          if (move && move !== 'START') {
            const delta = MOVE_TO_DELTA[move];
            current = {
              row: current.row + delta.row,
              col: current.col + delta.col,
            };
          }
        }
      }

      built.push({
        t: Number.isInteger(step?.t) ? step.t : index,
        move: toNormalizedMove(step?.move) || 'START',
        player: { ...current },
      });
    });

    // Keep only steps whose current position is at least representable by the frontend.
    // Out-of-bounds termination is encoded through judge/result reason, not invalid coordinates.
    return built.filter((step, idx) => {
      if (idx === 0) return true;
      return (
        step.player.row >= -1 &&
        step.player.row <= rows &&
        step.player.col >= -1 &&
        step.player.col <= cols
      );
    });
  }

  findStartInGrid(grid) {
    for (let row = 0; row < grid.length; row += 1) {
      const line = grid[row];
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] === 'S') {
          return { row, col };
        }
      }
    }
    return null;
  }

  updateSpeedLabel() {
    if (!this.elements.speedValue) return;
    this.elements.speedValue.textContent = `${this.speedMultiplier.toFixed(1)}x`;
  }

  setPlaybackControls(state) {
    const disable = (element, value) => {
      if (element) element.disabled = value;
    };

    if (state === 'playing') {
      disable(this.elements.playButton, true);
      disable(this.elements.pauseButton, false);
      disable(this.elements.resetButton, false);
      disable(this.elements.loadSimulation, true);
      disable(this.elements.simulationSelector, true);
      return;
    }

    if (state === 'stopped') {
      disable(this.elements.playButton, false);
      disable(this.elements.pauseButton, true);
      disable(this.elements.resetButton, false);
      disable(this.elements.loadSimulation, false);
      disable(this.elements.simulationSelector, false);
      return;
    }

    if (state === 'paused') {
      disable(this.elements.playButton, false);
      disable(this.elements.pauseButton, true);
      disable(this.elements.resetButton, false);
      disable(this.elements.loadSimulation, true);
      disable(this.elements.simulationSelector, true);
      return;
    }

    disable(this.elements.playButton, true);
    disable(this.elements.pauseButton, true);
    disable(this.elements.resetButton, true);
    disable(this.elements.loadSimulation, false);
    disable(this.elements.simulationSelector, false);
  }

  updateStatus(message, stateLabel) {
    if (this.elements.status) this.elements.status.textContent = message;
    if (this.elements.stateLabel) this.elements.stateLabel.textContent = stateLabel;
  }

  updateStepCounter() {
    if (!this.elements.stepCounter) return;
    const total = this.mazeData ? this.mazeData.steps.length : 0;
    const maxIndex = Math.max(total - 1, 0);
    const currentFromIndex = this.mazeData ? Math.min(this.currentStepIndex, maxIndex) : 0;
    const completed = Math.max(this.visitedCells.size - 1, 0);
    const current = Math.max(currentFromIndex, completed);
    this.elements.stepCounter.textContent = `${current} / ${total}`;
  }

  resolveJudgeMessage(judge) {
    if (judge && typeof judge.reason === 'string' && judge.reason.trim().length) {
      return judge.reason.trim();
    }
    return t('labyrinth.overlay.play_generated', 'Press Play to replay the generated path.');
  }

  handleChallengeRejection(reason) {
    this.stopPlayback();
    this.setPlaybackControls('no-simulation');
    this.updateStatus(t('common.submission_rejected', 'Submission rejected by challenge rules.'), t('common.rejected', 'Rejected'));
    this.showOverlay(
      t('labyrinth.overlay.rejected_title', 'Simulation rejected'),
      reason || t('labyrinth.overlay.rejected_message', 'The generated run was rejected.'),
      true
    );
  }

  showOverlay(title, message, options = {}) {
    const normalizedOptions = typeof options === 'boolean'
      ? { rejected: options }
      : (options && typeof options === 'object' ? options : {});
    const isRejected = Boolean(normalizedOptions.rejected);
    const isSuccess = Boolean(normalizedOptions.success);

    if (!this.elements.overlay) return;
    if (this.elements.overlayTitle) this.elements.overlayTitle.textContent = title;
    if (this.elements.overlayMessage) this.elements.overlayMessage.textContent = message;
    this.elements.overlay.classList.remove('hidden');
    this.elements.overlay.classList.remove('is-rejected', 'is-success');
    if (isRejected) {
      this.elements.overlay.classList.add('is-rejected');
    } else if (isSuccess) {
      this.elements.overlay.classList.add('is-success');
    }
  }

  hideOverlay() {
    if (!this.elements.overlay) return;
    this.elements.overlay.classList.add('hidden');
    this.elements.overlay.classList.remove('is-rejected', 'is-success');
  }

  showLoading(label) {
    this.showOverlay(label || t('common.loading', 'Loading...'), t('common.loading_wait', 'Please wait...'));
  }

  currentInterval() {
    return this.baseTickDuration / this.speedMultiplier;
  }

  resizeCanvas(rows, cols) {
    const container = document.querySelector('.challenge-game-column .canvas-container');
    if (!container) return;

    const availableWidth = Math.max(360, container.clientWidth - 16);
    const availableHeight = Math.max(320, container.clientHeight - 16);

    this.canvas.width = availableWidth;
    this.canvas.height = availableHeight;

    const cellSize = Math.min(availableWidth / cols, availableHeight / rows);
    this.ctx.lineWidth = Math.max(1, Math.floor(cellSize * 0.05));
  }

  drawPlaceholderGrid() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#071022';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = 'rgba(141, 245, 255, 0.15)';
    this.ctx.lineWidth = 1;

    const columns = 20;
    const rows = 14;
    for (let col = 1; col < columns; col += 1) {
      const x = (width / columns) * col;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    for (let row = 1; row < rows; row += 1) {
      const y = (height / rows) * row;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  renderCurrentFrame() {
    if (!this.mazeData || !this.mazeData.steps.length) {
      this.drawPlaceholderGrid();
      return;
    }

    const steps = this.mazeData.steps;
    const targetIndex = Math.min(this.currentStepIndex, steps.length - 1);
    const toStep = steps[targetIndex];
    const fromStep = targetIndex === 0 ? toStep : steps[targetIndex - 1];
    const progress = this.isPlaying ? this.lastProgress : 1;
    this.drawMaze(toStep, fromStep, progress);
  }

  drawMaze(toStep, fromStep, progress = 1) {
    if (!this.mazeData) return;

    const { grid, meta } = this.mazeData;
    const rows = meta.rows;
    const cols = meta.cols;

    const cellW = this.canvas.width / cols;
    const cellH = this.canvas.height / rows;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const wallColor = isLight ? getComputedStyle(document.documentElement).getPropertyValue('--labyrinth-wall-light').trim() || '#a8b2c8' : getComputedStyle(document.documentElement).getPropertyValue('--labyrinth-wall-dark').trim() || '#293146';
    const floorColor = isLight ? getComputedStyle(document.documentElement).getPropertyValue('--labyrinth-floor-light').trim() || '#f8fbff' : getComputedStyle(document.documentElement).getPropertyValue('--labyrinth-floor-dark').trim() || '#f2f6ff';

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = isLight ? '#edf3ff' : '#061022';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let row = 0; row < rows; row += 1) {
      const line = grid[row];
      for (let col = 0; col < cols; col += 1) {
        const cell = line[col];
        const x = col * cellW;
        const y = row * cellH;

        if (cell === '#') {
          this.ctx.fillStyle = wallColor;
          this.ctx.fillRect(x, y, cellW, cellH);
          this.ctx.strokeStyle = isLight ? 'rgba(20, 28, 48, 0.16)' : 'rgba(255, 255, 255, 0.08)';
          this.ctx.strokeRect(x, y, cellW, cellH);
          continue;
        }

        if (cell === 'S') {
          this.ctx.fillStyle = '#18b27f';
          this.ctx.fillRect(x, y, cellW, cellH);
          continue;
        }

        if (cell === 'E') {
          this.ctx.fillStyle = '#f7c96b';
          this.ctx.fillRect(x, y, cellW, cellH);
          continue;
        }

        this.ctx.fillStyle = floorColor;
        this.ctx.fillRect(x, y, cellW, cellH);
        this.ctx.strokeStyle = isLight ? 'rgba(25, 40, 65, 0.08)' : 'rgba(12, 23, 38, 0.11)';
        this.ctx.strokeRect(x, y, cellW, cellH);
      }
    }

    this.ctx.fillStyle = isLight ? 'rgba(45, 121, 201, 0.18)' : 'rgba(93, 224, 193, 0.2)';
    this.visitedCells.forEach((key) => {
      const [rowText, colText] = key.split(',');
      const row = Number(rowText);
      const col = Number(colText);
      if (!Number.isFinite(row) || !Number.isFinite(col)) return;
      if (row < 0 || row >= rows || col < 0 || col >= cols) return;
      this.ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
    });

    const start = fromStep?.player || toStep?.player;
    const end = toStep?.player;
    if (!start || !end) return;

    const row = start.row + (end.row - start.row) * progress;
    const col = start.col + (end.col - start.col) * progress;

    if (row < 0 || row >= rows || col < 0 || col >= cols) return;

    const x = col * cellW;
    const y = row * cellH;
    const centerX = x + cellW / 2;
    const centerY = y + cellH / 2;
    const radius = Math.min(cellW, cellH) * 0.45;

    const gradient = this.ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(141, 245, 255, 0.95)');
    gradient.addColorStop(1, 'rgba(247, 201, 107, 0.24)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    const padding = Math.min(cellW, cellH) * 0.2;
    this.ctx.fillStyle = '#d8ffe7';
    this.ctx.beginPath();
    this.ctx.roundRect(
      x + padding,
      y + padding,
      Math.max(cellW - 2 * padding, 1),
      Math.max(cellH - 2 * padding, 1),
      5
    );
    this.ctx.fill();
  }

  evaluateCurrentStep(step) {
    if (!this.mazeData || !step?.player) return { stop: false };

    const rows = this.mazeData.meta.rows;
    const cols = this.mazeData.meta.cols;
    const { row, col } = step.player;

    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return {
        stop: true,
        outcome: {
          status: 'fail',
          reason: `${t('labyrinth.reason.out_of_bounds_prefix', 'Path left the grid at')} (${row}, ${col}).`,
        },
      };
    }

    const cell = this.mazeData.grid[row][col];
    if (cell === '#') {
      return {
        stop: true,
        outcome: {
          status: 'fail',
          reason: `${t('labyrinth.reason.hit_wall_prefix', 'Hit a wall at')} (${row}, ${col}).`,
        },
      };
    }

    if (cell === 'E') {
      return {
        stop: true,
        outcome: {
          status: 'success',
          reason: `${t('labyrinth.reason.exit_reached_prefix', 'Reached exit in')} ${this.currentStepIndex} ${t('common.step', 'Step').toLowerCase()}.`,
        },
      };
    }

    return { stop: false };
  }

  play() {
    if (!this.mazeData || !this.mazeData.steps.length) {
      this.showOverlay(
        t('labyrinth.overlay.no_sim_title', 'No simulation'),
        t('labyrinth.overlay.no_sim_message', 'Generate or load a simulation before pressing Play.')
      );
      return;
    }

    if (this.isPlaying) return;

    const steps = this.mazeData.steps;
    if (this.currentStepIndex >= steps.length) {
      this.currentStepIndex = 0;
      this.visitedCells = new Set();
      if (steps[0]?.player) {
        this.visitedCells.add(`${steps[0].player.row},${steps[0].player.col}`);
      }
    }

    this.isPlaying = true;
    this.gameOutcome = null;
    this.lastProgress = 0;
    this.setPlaybackControls('playing');
    this.updateStatus(t('labyrinth.status.playing', 'Playing generated simulation...'), t('labyrinth.status.playing_label', 'Playing'));
    this.hideOverlay();
    this.renderCurrentFrame();

    this.stepStartTime = performance.now();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame((timestamp) => this.tickPlayback(timestamp));
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.setPlaybackControls('paused');
    this.updateStatus(t('labyrinth.status.paused', 'Playback paused.'), t('common.pause', 'Paused'));
    this.showOverlay(t('common.pause', 'Paused'), t('labyrinth.overlay.resume', 'Press Play to resume the simulation.'));
  }

  reset() {
    if (!this.mazeData) return;

    this.stopPlayback();
    this.currentStepIndex = 0;
    this.lastProgress = 0;
    this.gameOutcome = null;
    this.visitedCells = new Set();

    const firstStep = this.mazeData.steps[0];
    if (firstStep?.player) {
      this.visitedCells.add(`${firstStep.player.row},${firstStep.player.col}`);
    }

    this.renderCurrentFrame();
    this.updateStepCounter();
    this.setPlaybackControls('stopped');
    this.updateStatus(t('labyrinth.status.reset', 'Replay reset to step 0.'), t('common.ready', 'Ready'));
    this.showOverlay(t('labyrinth.overlay.reset_title', 'Reset'), t('labyrinth.overlay.reset_message', 'Ready for a new replay.'));
  }

  tickPlayback(timestamp) {
    if (!this.isPlaying || !this.mazeData) return;

    const { steps } = this.mazeData;
    if (this.currentStepIndex >= steps.length) {
      this.applyFallbackOutcomeIfNeeded();
      this.endPlayback();
      return;
    }

    const toStep = steps[this.currentStepIndex];
    const fromStep = this.currentStepIndex === 0 ? toStep : steps[this.currentStepIndex - 1];

    const duration = this.currentInterval();
    const elapsed = timestamp - this.stepStartTime;
    const progress = Math.min(elapsed / duration, 1);
    this.lastProgress = progress;

    this.drawMaze(toStep, fromStep, progress);

    if (progress >= 1) {
      const evaluation = this.evaluateCurrentStep(toStep);
      if (evaluation.stop) {
        this.gameOutcome = evaluation.outcome;
        this.endPlayback();
        return;
      }

      this.visitedCells.add(`${toStep.player.row},${toStep.player.col}`);
      this.currentStepIndex += 1;
      this.updateStepCounter();
      this.stepStartTime = timestamp;
    }

    if (this.currentStepIndex >= steps.length) {
      this.applyFallbackOutcomeIfNeeded();
      this.endPlayback();
      return;
    }

    this.animationFrameId = requestAnimationFrame((nextTime) => this.tickPlayback(nextTime));
  }

  applyFallbackOutcomeIfNeeded() {
    if (this.gameOutcome) return;

    const simulationResult = this.mazeData?.result;
    if (simulationResult && typeof simulationResult === 'object') {
      const normalizedOutcome = String(simulationResult.outcome || '').toLowerCase() === 'success' ? 'success' : 'fail';
      this.gameOutcome = {
        status: normalizedOutcome,
        reason: simulationResult.reason || (normalizedOutcome === 'success'
          ? t('labyrinth.reason.exit_reached_short', 'Reached exit.')
          : t('labyrinth.reason.path_ended', 'Path ended before reaching the exit.')),
      };
      return;
    }

    this.gameOutcome = {
      status: 'fail',
      reason: t('labyrinth.reason.path_ended', 'Path ended before reaching the exit.'),
    };
  }

  endPlayback() {
    this.stopPlayback();
    this.setPlaybackControls('stopped');

    const outcome = this.gameOutcome || { status: 'fail', reason: t('labyrinth.reason.simulation_ended', 'Simulation ended.') };
    const isSuccess = outcome.status === 'success';

    this.updateStatus(
      isSuccess ? t('labyrinth.status.finished_success', 'Simulation finished successfully.') : t('labyrinth.status.finished_failure', 'Simulation finished with failure.'),
      isSuccess ? t('labyrinth.status.success', 'Success') : t('common.finished', 'Finished')
    );

    const successTitle = t('labyrinth.overlay.congrats', 'Congratulations!');
    const successMessage = outcome.reason
      ? `${outcome.reason} ${t('labyrinth.overlay.congrats_suffix', 'Great job solving the labyrinth.')}`
      : t('labyrinth.overlay.exit_reached_message', 'Exit reached. Great job solving the labyrinth.');

    this.showOverlay(
      isSuccess ? successTitle : t('labyrinth.overlay.run_ended', 'Run ended'),
      isSuccess ? successMessage : (outcome.reason || t('labyrinth.reason.ended_without_exit', 'Simulation ended without reaching exit.')),
      { success: isSuccess }
    );
  }

  stopPlayback() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new LabyrinthChallengeApp();
  app.initialize();
});
