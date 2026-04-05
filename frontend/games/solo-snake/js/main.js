// ============================================
// MAIN APPLICATION
// Wires together loader, engine, renderer, and UI
// ============================================

import { SimulationLoader } from './SimulationLoader.js';
import { GameEngine } from './GameEngine.js';
import { Renderer } from './Renderer.js';
import { UIController } from './UIController.js';

const t = (key, fallback = '') => {
  if (window.ArenaI18n && typeof window.ArenaI18n.t === 'function') {
    return window.ArenaI18n.t(key, fallback);
  }
  return fallback || key;
};

class SoloSnakeApp {
  constructor() {
    this.loader = new SimulationLoader();
    this.engine = null;
    this.renderer = null;
    this.ui = new UIController();

    this.isPlaying = false;
    this.isPaused = false;
    this.animationFrameId = null;
    this.baseStepInterval = 750;
    this.stepInterval = this.baseStepInterval;
    this.speed = 1;
    this.lastStepTime = 0;
    this.playgroundMessageHandler = null;

    this.canvas = null;
    this.currentSimulation = null;
  }

  async initialize() {
    this.ui.initialize();
    this.canvas = document.getElementById('gameCanvas');
    this.setupUICallbacks();
    this.setupPlaygroundBridge();

    window.addEventListener('resize', () => {
      if (this.renderer && this.engine) {
        this.renderer.resize(this.engine.grid);
        this.renderer.render(this.engine.getState());
      }
    });

    this.ui.showOverlay(
      t('snake.title', 'Solo Snake Sprint'),
      t('snake.overlay.start', 'Write code and press Run to generate a simulation, then press Play to begin')
    );
    this.ui.setPlaybackControls('no-simulation');
  }

  setupUICallbacks() {
    this.ui.on('loadSimulation', (path) => this.loadSimulation(path));
    this.ui.on('play', () => this.play());
    this.ui.on('pause', () => this.pause());
    this.ui.on('reset', () => this.reset());
    this.ui.on('speedChange', (speed) => this.setSpeed(speed));
    this.ui.on('settingChange', (settings) => this.updateSettings(settings));
  }

  async loadSimulation(path) {
    try {
      this.ui.showLoadingAnimation(t('snake.overlay.loading_path', 'Loading Path...'));
      await new Promise(resolve => setTimeout(resolve, 500));

      this.currentSimulation = await this.loader.loadSimulation(path);
      this.engine = new GameEngine(this.currentSimulation);
      this.engine.initialize();

      const settings = this.ui.getSettings();
      this.renderer = new Renderer(this.canvas, settings);
      this.renderer.resize(this.engine.grid);
      this.renderer.render(this.engine.getState());

      const state = this.engine.getState();
      this.ui.updateSnakeInfo(state.snake);
      this.ui.updateGameStatus(0, t('common.ready', 'Ready'));

      this.ui.hideOverlay();
      this.ui.setPlaybackControls('stopped');
    } catch (error) {
      console.error(error);
      this.ui.showError(t('snake.error.load', 'Failed to load simulation.'));
      this.ui.setPlaybackControls('no-simulation');
    }
  }

  setupPlaygroundBridge() {
    this.playgroundMessageHandler = async (event) => {
      const payload = event?.data;
      if (!payload || typeof payload !== 'object') return;

      if (payload.type === 'snake-simulation-generated') {
        if (!payload.simulation || typeof payload.simulation !== 'object') return;

        try {
          await this.loadGeneratedSimulation(payload.simulation, payload.judge || null);
        } catch (error) {
          console.error(error);
          this.ui.showError(t('snake.error.load_generated', 'Failed to load generated simulation.'));
        }
        return;
      }

      if (payload.type === 'snake-simulation-rejected') {
        const reason = typeof payload.reason === 'string' && payload.reason.trim().length
          ? payload.reason.trim()
          : (payload?.judge?.reason || t('common.submission_rejected', 'Submission rejected by challenge rules.'));
        this.handleChallengeRejection(reason);
      }
    };

    window.addEventListener('message', this.playgroundMessageHandler);
  }

  handleChallengeRejection(reason) {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.currentSimulation = null;
    this.engine = null;

    this.ui.updateGameStatus(0, t('common.rejected', 'Rejected'));
    this.ui.setPlaybackControls('no-simulation');
    this.ui.showChallengeRejection(reason);
  }

  async loadGeneratedSimulation(simulationData, judge = null) {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.ui.showLoadingAnimation(t('snake.overlay.loading_generated', 'Loading Generated Run...'));
    await new Promise(resolve => setTimeout(resolve, 250));

    this.currentSimulation = this.loader.normalize(simulationData);
    this.engine = new GameEngine(this.currentSimulation);
    this.engine.initialize();

    const settings = this.ui.getSettings();
    this.renderer = new Renderer(this.canvas, settings);
    this.renderer.resize(this.engine.grid);
    this.renderer.render(this.engine.getState());

    const state = this.engine.getState();
    this.ui.updateSnakeInfo(state.snake);
    this.ui.updateGameStatus(0, t('common.ready', 'Ready'));
    this.ui.setPlaybackControls('stopped');

    const judgeMessage = judge && typeof judge.reason === 'string' && judge.reason.trim().length
      ? judge.reason
      : t('snake.overlay.generated_hint', 'Press Play to replay the generated path.');
    this.ui.showOverlay(t('snake.overlay.generated_title', 'Generated simulation ready'), judgeMessage);
  }

  async play() {
    if (!this.engine) {
      this.ui.showError(t('snake.error.load_first', 'Please load a simulation first'));
      return;
    }

    if (this.isPaused && !this.engine.isGameOver) {
      this.isPlaying = true;
      this.isPaused = false;
      this.ui.setPlaybackControls('playing');
      this.ui.updateGameStatus(this.engine.currentTurn, t('snake.status.playing', 'Playing'));
      this.lastStepTime = performance.now();
      this.gameLoop();
      return;
    }

    if (this.engine.isGameOver) {
      this.engine.reset();
      this.renderer.reset();
      this.renderer.render(this.engine.getState());
      const state = this.engine.getState();
      this.ui.updateSnakeInfo(state.snake);
      this.ui.updateGameStatus(0, t('common.ready', 'Ready'));
    }

    if (window.innerWidth <= 968) {
      const canvas = document.getElementById('gameCanvas');
      canvas?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const state = this.engine.getState();
    await this.ui.showLaunchAnimation(state.snake, 0);

    this.isPlaying = true;
    this.isPaused = false;
    this.ui.setPlaybackControls('playing');
    this.ui.hideOverlay();
    this.ui.updateGameStatus(this.engine.currentTurn, t('snake.status.playing', 'Playing'));

    this.lastStepTime = performance.now();
    this.gameLoop();
  }

  pause() {
    this.isPlaying = false;
    this.isPaused = true;
    this.ui.setPlaybackControls('paused');
    this.ui.updateGameStatus(this.engine?.currentTurn || 0, t('common.pause', 'Paused'));
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  reset() {
    this.pause();
    if (this.engine) {
      this.engine.reset();
      this.renderer?.reset();
      this.renderer?.render(this.engine.getState());
      const state = this.engine.getState();
      this.ui.updateSnakeInfo(state.snake);
      this.ui.updateGameStatus(0, t('common.ready', 'Ready'));
      this.ui.hideOverlay();
      this.ui.setPlaybackControls('stopped');
    }
  }

  setSpeed(speed) {
    this.speed = speed;
    this.stepInterval = this.baseStepInterval / speed;
  }

  updateSettings(settings) {
    if (this.renderer) {
      this.renderer.updateSettings(settings);
      if (settings.cellSize && this.engine) {
        this.renderer.resize(this.engine.grid);
      }
      if (this.engine) {
        this.renderer.render(this.engine.getState());
      }
    }
  }

  gameLoop(currentTime = 0) {
    if (!this.isPlaying) return;
    const elapsed = currentTime - this.lastStepTime;
    const progress = Math.min(elapsed / this.stepInterval, 1);

    if (this.engine && this.renderer) {
      this.renderer.render(this.engine.getState(), progress);
    }

    if (elapsed >= this.stepInterval) {
      const canContinue = this.engine.step();
      const state = this.engine.getState();
      this.ui.updateSnakeInfo(state.snake);
      this.ui.updateGameStatus(
        state.currentTurn,
        this.engine.isGameOver ? t('snake.status.game_over', 'Game Over') : t('snake.status.playing', 'Playing')
      );
      this.lastStepTime = currentTime;

      if (!canContinue) {
        this.handleGameEnd();
        return;
      }
    }

    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  handleGameEnd() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const result = this.engine.gameResult;
    if (!result) return;

    // Let the final frame settle before showing overlay
    requestAnimationFrame(() => {
      this.renderer.render(this.engine.getState(), 1);
      this.ui.showGameResult(result);
      this.ui.setPlaybackControls('stopped');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new SoloSnakeApp();
  app.initialize();
  window.soloSnakeApp = app;
});
