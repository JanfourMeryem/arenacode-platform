// ============================================
// UI CONTROLLER
// Manages controls, overlay, and theme
// ============================================

const GLOBAL_THEME_KEY = 'arenacode-theme';
const LEGACY_THEME_KEYS = ['theme', 'labyrinth-theme', 'treasure-theme'];
const t = (key, fallback = '') => {
  if (window.ArenaI18n && typeof window.ArenaI18n.t === 'function') {
    return window.ArenaI18n.t(key, fallback);
  }
  return fallback || key;
};

function normalizeThemeValue(theme) {
  return theme === 'light' ? 'light' : 'dark';
}

function readStoredTheme() {
  const current = localStorage.getItem(GLOBAL_THEME_KEY);
  if (current === 'dark' || current === 'light') return current;

  for (const key of LEGACY_THEME_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy === 'dark' || legacy === 'light') {
      localStorage.setItem(GLOBAL_THEME_KEY, legacy);
      return legacy;
    }
  }

  return 'dark';
}

export class UIController {
  constructor() {
    this.elements = {};
    this.callbacks = {};
    this.currentTheme = 'dark';
  }

  initialize() {
    this.elements = {
      themeToggle: document.getElementById('themeToggle'),
      settingsToggle: document.getElementById('settingsToggle'),
      loadSimulation: document.getElementById('loadSimulation'),
      playButton: document.getElementById('playButton'),
      pauseButton: document.getElementById('pauseButton'),
      resetButton: document.getElementById('resetButton'),
      simulationSelector: document.getElementById('simulationSelector'),
      speedSlider: document.getElementById('speedSlider'),
      snakeName: document.getElementById('snakeName'),
      snakeDirection: document.getElementById('snakeDirection'),
      snakeStatus: document.getElementById('snakeStatus'),
      snakeLength: document.getElementById('snakeLength'),
      appleProgress: document.getElementById('appleProgress'),
      currentTurn: document.getElementById('currentTurn'),
      gameState: document.getElementById('gameState'),
      speedValue: document.getElementById('speedValue'),
      gameOverlay: document.getElementById('gameOverlay'),
      overlayTitle: document.getElementById('overlayTitle'),
      overlayMessage: document.getElementById('overlayMessage'),
      settingsPanel: document.getElementById('settingsPanel'),
      showGridLines: document.getElementById('showGridLines'),
      showGlow: document.getElementById('showGlow'),
      smoothAnimation: document.getElementById('smoothAnimation'),
      cellSizeSlider: document.getElementById('cellSizeSlider')
    };

    this.setupEventListeners();
    this.loadTheme();
  }

  setupEventListeners() {
    this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
    this.elements.settingsToggle?.addEventListener('click', () => this.toggleSettings());

    const settingsClose = document.getElementById('settingsClose');
    const settingsOverlay = document.getElementById('settingsPanelOverlay');
    settingsClose?.addEventListener('click', () => this.toggleSettings());
    settingsOverlay?.addEventListener('click', () => this.toggleSettings());

    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        this.setTheme(theme);
        document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    this.elements.loadSimulation?.addEventListener('click', () => {
      this.triggerCallback('loadSimulation', this.elements.simulationSelector.value);
    });

    this.elements.playButton?.addEventListener('click', () => this.triggerCallback('play'));
    this.elements.pauseButton?.addEventListener('click', () => this.triggerCallback('pause'));
    this.elements.resetButton?.addEventListener('click', () => this.triggerCallback('reset'));

    this.elements.speedSlider?.addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value);
      this.elements.speedValue.textContent = `${speed.toFixed(1)}x`;
      this.triggerCallback('speedChange', speed);
    });

    this.elements.showGridLines?.addEventListener('change', (e) => {
      this.triggerCallback('settingChange', { showGridLines: e.target.checked });
    });

    this.elements.showGlow?.addEventListener('change', (e) => {
      this.triggerCallback('settingChange', { showGlow: e.target.checked });
    });

    this.elements.smoothAnimation?.addEventListener('change', (e) => {
      this.triggerCallback('settingChange', { smoothAnimation: e.target.checked });
    });

    this.elements.cellSizeSlider?.addEventListener('input', (e) => {
      const cellSize = parseInt(e.target.value);
      this.triggerCallback('settingChange', { cellSize });
    });
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  triggerCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    const normalized = normalizeThemeValue(theme);
    this.currentTheme = normalized;

    if (window.ArenaTheme?.applyTheme) {
      window.ArenaTheme.applyTheme(normalized);
    } else {
      document.documentElement.setAttribute('data-theme', normalized);
      localStorage.setItem(GLOBAL_THEME_KEY, normalized);
    }
  }

  loadTheme() {
    const savedTheme = window.ArenaTheme?.getTheme?.() || readStoredTheme();
    this.setTheme(savedTheme);
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === savedTheme);
    });
  }

  toggleSettings() {
    this.elements.settingsPanel.classList.toggle('open');
    const overlay = document.getElementById('settingsPanelOverlay');
    overlay?.classList.toggle('active');
  }

  updateSnakeInfo(snake) {
    if (snake) {
      if (this.elements.snakeName) this.elements.snakeName.textContent = snake.name;
      if (this.elements.snakeDirection) this.elements.snakeDirection.textContent = this.formatDirection(snake.direction);
      if (this.elements.snakeStatus) this.elements.snakeStatus.textContent = snake.isAlive ? t('snake.status.alive', 'Alive') : t('snake.status.eliminated', 'Eliminated');
      if (this.elements.snakeLength) this.elements.snakeLength.textContent = snake.positions.length;
    }
    if (this.elements.appleProgress) this.elements.appleProgress.textContent = t('snake.status.auto_grow', 'Auto-grow');
  }

  updateGameStatus(turn, state) {
    if (this.elements.currentTurn) this.elements.currentTurn.textContent = turn;
    if (this.elements.gameState) this.elements.gameState.textContent = state;
  }

  formatDirection(dir) {
    if (!dir) return '—';
    if (dir.x === 1) return `→ ${t('snake.direction.right', 'Right')}`;
    if (dir.x === -1) return `← ${t('snake.direction.left', 'Left')}`;
    if (dir.y === 1) return `↓ ${t('snake.direction.down', 'Down')}`;
    if (dir.y === -1) return `↑ ${t('snake.direction.up', 'Up')}`;
    return '—';
  }

  showOverlay(title, message, options = {}) {
    const normalized = options && typeof options === 'object' ? options : {};
    const isRejected = Boolean(normalized.rejected);

    this.elements.overlayTitle.textContent = title;
    this.elements.overlayMessage.textContent = message;
    this.elements.gameOverlay.classList.remove('hidden', 'loading', 'is-rejected');
    if (isRejected) {
      this.elements.gameOverlay.classList.add('is-rejected');
    }
  }

  hideOverlay() {
    this.elements.gameOverlay.classList.add('hidden');
    this.elements.gameOverlay.classList.remove('loading', 'is-rejected');
  }

  setPlaybackControls(state) {
    const setDisabled = (el, disabled) => {
      if (el) el.disabled = disabled;
    };

    switch (state) {
      case 'playing':
        setDisabled(this.elements.playButton, true);
        setDisabled(this.elements.pauseButton, false);
        setDisabled(this.elements.resetButton, false);
        setDisabled(this.elements.loadSimulation, true);
        setDisabled(this.elements.simulationSelector, true);
        break;
      case 'paused':
        setDisabled(this.elements.playButton, false);
        setDisabled(this.elements.pauseButton, true);
        setDisabled(this.elements.resetButton, false);
        setDisabled(this.elements.loadSimulation, true);
        setDisabled(this.elements.simulationSelector, true);
        break;
      case 'stopped':
        setDisabled(this.elements.playButton, false);
        setDisabled(this.elements.pauseButton, true);
        setDisabled(this.elements.resetButton, false);
        setDisabled(this.elements.loadSimulation, false);
        setDisabled(this.elements.simulationSelector, false);
        break;
      case 'no-simulation':
      default:
        setDisabled(this.elements.playButton, true);
        setDisabled(this.elements.pauseButton, true);
        setDisabled(this.elements.resetButton, true);
        setDisabled(this.elements.loadSimulation, false);
        setDisabled(this.elements.simulationSelector, false);
        break;
    }
  }

  getSelectedSimulationPath() {
    return this.elements.simulationSelector?.value || 'simulations/solo-1-perfect-run.json';
  }

  showGameResult(result) {
    let title = '';
    let message = '';

    if (result.outcome === 'success') {
      title = t('snake.result.perfect', 'Perfect Run!');
      message = result.reason;
    } else {
      title = t('snake.result.crash', 'Crash!');
      message = `${result.reason}. ${t('snake.result.stops_at_turn', 'Replay stops at turn')} ${result.finalTurn}`;
    }

    this.showOverlay(title, message);
  }

  showError(message) {
    this.showOverlay(t('common.error', 'Error'), message);
  }

  showChallengeRejection(message) {
    const reason = typeof message === 'string' && message.trim().length
      ? message.trim()
      : t('common.submission_rejected', 'Submission rejected by challenge rules.');
    this.showOverlay(t('snake.overlay.rejected_title', 'Simulation rejected'), reason, { rejected: true });
  }

  showLoadingAnimation(message) {
    this.elements.overlayTitle.innerHTML = `
      <div class="loading-spinner"></div>
      <span>${message}</span>
    `;
    this.elements.overlayMessage.textContent = t('common.loading_wait', 'Please wait...');
    this.elements.gameOverlay.classList.remove('hidden');
    this.elements.gameOverlay.classList.add('loading');
    this.elements.gameOverlay.classList.remove('is-rejected');
  }

  showLaunchAnimation(snake, applesTotal) {
    // Skip intro overlay — start immediately
    this.hideOverlay();
    return Promise.resolve();
  }

  restoreOverlayShell() {
    this.elements.gameOverlay.innerHTML = `
      <div class="overlay-content">
        <h2 class="overlay-title" id="overlayTitle"></h2>
        <p class="overlay-message" id="overlayMessage"></p>
      </div>
    `;
    this.elements.overlayTitle = document.getElementById('overlayTitle');
    this.elements.overlayMessage = document.getElementById('overlayMessage');
  }

  getSettings() {
    return {
      showGridLines: this.elements.showGridLines?.checked ?? true,
      showGlow: this.elements.showGlow?.checked ?? true,
      smoothAnimation: this.elements.smoothAnimation?.checked ?? true,
      cellSize: parseInt(this.elements.cellSizeSlider?.value ?? 32)
    };
  }
}
