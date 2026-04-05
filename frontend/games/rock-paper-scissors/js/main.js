const MOVE_BY_CODE = Object.freeze({
  1: { code: 1, name: 'ROCK', glyph: '\u{1FAA8}' },
  2: { code: 2, name: 'PAPER', glyph: '\u{1F4C4}' },
  3: { code: 3, name: 'SCISSORS', glyph: '\u2702\uFE0F' },
});

const CODE_BY_NAME = Object.freeze({
  ROCK: 1,
  PAPER: 2,
  SCISSORS: 3,
});
const DEFAULT_TICK_DURATION_MS = 900;
const t = (key, fallback = '') => {
  if (window.ArenaI18n && typeof window.ArenaI18n.t === 'function') {
    return window.ArenaI18n.t(key, fallback);
  }
  return fallback || key;
};
const DEFAULT_REJECTION_MESSAGE = () => t('common.submission_rejected', 'Submission rejected by challenge rules.');

function getMoveLabel(code) {
  if (code === 1) return t('rps.move.rock', 'Rock');
  if (code === 2) return t('rps.move.paper', 'Paper');
  return t('rps.move.scissors', 'Scissors');
}

function getRoundOutcomeLabel(outcome) {
  if (outcome === 'win') return t('rps.round.win', 'Win');
  if (outcome === 'loss') return t('rps.round.loss', 'Lose');
  return t('rps.round.draw', 'Draw');
}

function formatSummaryStats(wins, losses, draws) {
  return t('rps.summary.stats', '{wins} win(s), {losses} loss(es), {draws} draw(s).')
    .replace('{wins}', String(wins))
    .replace('{losses}', String(losses))
    .replace('{draws}', String(draws));
}

const elements = {
  rpsStage: document.getElementById('rpsStage'),
  playerMoveGlyph: document.getElementById('playerMoveGlyph'),
  playerMoveLabel: document.getElementById('playerMoveLabel'),
  botMoveGlyph: document.getElementById('botMoveGlyph'),
  botMoveLabel: document.getElementById('botMoveLabel'),
  roundResultBadge: document.getElementById('roundResultBadge'),
  roundCounter: document.getElementById('roundCounter'),
  statusRound: document.getElementById('statusRound'),
  stateLabel: document.getElementById('stateLabel'),
  statusLastResult: document.getElementById('statusLastResult'),
  matchOutcome: document.getElementById('matchOutcome'),
  winsTotal: document.getElementById('winsTotal'),
  lossesTotal: document.getElementById('lossesTotal'),
  drawsTotal: document.getElementById('drawsTotal'),
  statusMessage: document.getElementById('statusMessage'),
  overlay: document.getElementById('gameOverlay'),
  overlayTitle: document.getElementById('overlayTitle'),
  overlayMessage: document.getElementById('overlayMessage'),
  btnPlay: document.getElementById('btnPlay'),
  btnPause: document.getElementById('btnPause'),
  btnReset: document.getElementById('btnReset'),
  speedSlider: document.getElementById('speedSlider'),
  speedValue: document.getElementById('speedValue'),
  simulationSelector: document.getElementById('simulationSelector'),
  loadSimulation: document.getElementById('loadSimulation'),
};

let currentSimulation = null;
let rounds = [];
let currentRoundIndex = -1;
let isPlaying = false;
let animationFrameId = null;
let roundStartTime = 0;
let pausedAt = null;
let speedMultiplier = parseFloat(elements.speedSlider?.value || '1') || 1;
let tickDurationMs = DEFAULT_TICK_DURATION_MS;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function normalizeMoveCode(value) {
  if (Number.isInteger(value) && value >= 1 && value <= 3) {
    return value;
  }

  const token = String(value || '').trim().toUpperCase();
  if (token === '1' || token === 'ROCK') return 1;
  if (token === '2' || token === 'PAPER') return 2;
  if (token === '3' || token === 'SCISSORS') return 3;
  return null;
}

function resolveRoundOutcome(userMoveCode, botMoveCode) {
  if (userMoveCode === botMoveCode) return 'draw';

  if (
    (userMoveCode === 1 && botMoveCode === 3)
    || (userMoveCode === 2 && botMoveCode === 1)
    || (userMoveCode === 3 && botMoveCode === 2)
  ) {
    return 'win';
  }

  return 'loss';
}

function computeMatchSummary(roundItems) {
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const round of roundItems) {
    if (round.outcome === 'win') wins += 1;
    if (round.outcome === 'loss') losses += 1;
    if (round.outcome === 'draw') draws += 1;
  }

  let outcome = 'draw';
  let reason = `${t('rps.summary.draw', 'Match draw')}: ${formatSummaryStats(wins, losses, draws)}`;

  if (wins > losses) {
    outcome = 'success';
    reason = `${t('rps.summary.player_wins', 'You win the match')}: ${formatSummaryStats(wins, losses, draws)}`;
  } else if (losses > wins) {
    outcome = 'defeat';
    reason = `${t('rps.summary.bot_wins', 'Bot wins the match')}: ${formatSummaryStats(wins, losses, draws)}`;
  }

  return { wins, losses, draws, outcome, reason };
}

function normalizeSimulation(simulationPayload) {
  if (typeof window.validateRockPaperScissorsSimulation === 'function') {
    const validation = window.validateRockPaperScissorsSimulation(simulationPayload);
    if (!validation.ok) {
      throw new Error(validation.errors.join(' | '));
    }
  }

  if (!simulationPayload || typeof simulationPayload !== 'object') {
    throw new Error(t('rps.error.payload_invalid', 'Simulation payload is empty or invalid.'));
  }

  const rawRounds = Array.isArray(simulationPayload.rounds) ? simulationPayload.rounds : [];
  if (!rawRounds.length) {
    throw new Error(t('rps.error.no_rounds', 'Simulation contains no rounds.'));
  }

  const normalizedRounds = rawRounds.map((rawRound, index) => {
    const userMoveCode = normalizeMoveCode(rawRound?.userMoveCode ?? rawRound?.userMove);
    const botMoveCode = normalizeMoveCode(rawRound?.botMoveCode ?? rawRound?.botMove);

    if (!userMoveCode || !botMoveCode) {
      throw new Error(`${t('rps.error.round_invalid_prefix', 'Round')} ${index + 1}: ${t('rps.error.round_invalid_codes', 'invalid move codes.')}`);
    }

    const fallbackOutcome = resolveRoundOutcome(userMoveCode, botMoveCode);
    const outcomeToken = String(rawRound?.outcome || fallbackOutcome).trim().toLowerCase();
    const outcome = outcomeToken === 'win' || outcomeToken === 'loss' || outcomeToken === 'draw'
      ? outcomeToken
      : fallbackOutcome;

    return {
      t: Number.isFinite(rawRound?.t) ? Number(rawRound.t) : index,
      round: Number.isFinite(rawRound?.round) ? Number(rawRound.round) : index + 1,
      userMoveCode,
      botMoveCode,
      userMove: MOVE_BY_CODE[userMoveCode].name,
      botMove: MOVE_BY_CODE[botMoveCode].name,
      outcome,
    };
  });

  const summary = computeMatchSummary(normalizedRounds);
  const payloadResult = simulationPayload.result && typeof simulationPayload.result === 'object'
    ? simulationPayload.result
    : null;

  const declaredOutcome = String(payloadResult?.outcome || '').trim().toLowerCase();
  const normalizedOutcome = declaredOutcome === 'success' || declaredOutcome === 'defeat' || declaredOutcome === 'draw'
    ? declaredOutcome
    : summary.outcome;

  const result = {
    outcome: normalizedOutcome,
    reason: typeof payloadResult?.reason === 'string' && payloadResult.reason.trim().length
      ? payloadResult.reason.trim()
      : summary.reason,
    wins: toInteger(payloadResult?.wins, summary.wins),
    losses: toInteger(payloadResult?.losses, summary.losses),
    draws: toInteger(payloadResult?.draws, summary.draws),
  };

  const roundsCount = toInteger(simulationPayload?.meta?.rounds, normalizedRounds.length);
  const normalizedRoundCount = roundsCount > 0 ? roundsCount : normalizedRounds.length;

  return {
    meta: {
      rounds: normalizedRoundCount,
      tickDurationMs: Math.max(140, toInteger(simulationPayload?.meta?.tickDurationMs, DEFAULT_TICK_DURATION_MS)),
    },
    rounds: normalizedRounds,
    result,
  };
}

function setStatusMessage(message) {
  if (!elements.statusMessage) return;
  elements.statusMessage.textContent = message || '';
}

function setRoundCounter(current, total) {
  const text = `${Math.max(current, 0)} / ${Math.max(total, 0)}`;
  if (elements.roundCounter) elements.roundCounter.textContent = text;
  if (elements.statusRound) elements.statusRound.textContent = text;
}

function setStateLabel(value) {
  if (elements.stateLabel) elements.stateLabel.textContent = value;
}

function setLastResult(value) {
  if (elements.statusLastResult) elements.statusLastResult.textContent = value;
}

function setMatchOutcome(value) {
  if (elements.matchOutcome) elements.matchOutcome.textContent = value;
}

function updateScoreBoard({ wins, losses, draws }) {
  if (elements.winsTotal) elements.winsTotal.textContent = String(wins);
  if (elements.lossesTotal) elements.lossesTotal.textContent = String(losses);
  if (elements.drawsTotal) elements.drawsTotal.textContent = String(draws);
}

function getScoreUpToRound(roundIndex) {
  if (roundIndex < 0 || !rounds.length) {
    return { wins: 0, losses: 0, draws: 0 };
  }

  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (let i = 0; i <= roundIndex && i < rounds.length; i += 1) {
    const outcome = rounds[i].outcome;
    if (outcome === 'win') wins += 1;
    if (outcome === 'loss') losses += 1;
    if (outcome === 'draw') draws += 1;
  }

  return { wins, losses, draws };
}

function clearRoundResultBadge() {
  if (!elements.roundResultBadge) return;
  elements.roundResultBadge.classList.remove('is-win', 'is-loss', 'is-draw');
}

function animateGlyphSwap(element) {
  if (!element) return;
  element.classList.remove('is-updating');
  void element.offsetWidth;
  element.classList.add('is-updating');
  window.setTimeout(() => {
    element.classList.remove('is-updating');
  }, 170);
}

function renderIdleState() {
  if (elements.playerMoveGlyph) elements.playerMoveGlyph.textContent = '?';
  if (elements.botMoveGlyph) elements.botMoveGlyph.textContent = '?';
  if (elements.playerMoveLabel) elements.playerMoveLabel.textContent = t('common.waiting', 'Waiting');
  if (elements.botMoveLabel) elements.botMoveLabel.textContent = t('common.waiting', 'Waiting');

  if (elements.roundResultBadge) {
    clearRoundResultBadge();
    elements.roundResultBadge.textContent = t('common.waiting', 'Waiting');
  }

  setRoundCounter(0, rounds.length);
  setLastResult(t('common.waiting', 'Waiting'));
  updateScoreBoard({ wins: 0, losses: 0, draws: 0 });
}

function renderRound(roundIndex, options = {}) {
  const round = rounds[roundIndex];
  if (!round) {
    renderIdleState();
    return;
  }

  if (elements.playerMoveGlyph) elements.playerMoveGlyph.textContent = MOVE_BY_CODE[round.userMoveCode].glyph;
  if (elements.botMoveGlyph) elements.botMoveGlyph.textContent = MOVE_BY_CODE[round.botMoveCode].glyph;
  if (elements.playerMoveLabel) elements.playerMoveLabel.textContent = getMoveLabel(round.userMoveCode);
  if (elements.botMoveLabel) elements.botMoveLabel.textContent = getMoveLabel(round.botMoveCode);

  if (options.animate) {
    animateGlyphSwap(elements.playerMoveGlyph);
    animateGlyphSwap(elements.botMoveGlyph);
  }

  if (elements.roundResultBadge) {
    clearRoundResultBadge();
    elements.roundResultBadge.textContent = getRoundOutcomeLabel(round.outcome);
    if (round.outcome === 'win') elements.roundResultBadge.classList.add('is-win');
    if (round.outcome === 'loss') elements.roundResultBadge.classList.add('is-loss');
    if (round.outcome === 'draw') elements.roundResultBadge.classList.add('is-draw');
  }

  const score = getScoreUpToRound(roundIndex);
  updateScoreBoard(score);
  setRoundCounter(roundIndex + 1, rounds.length);
  setLastResult(getRoundOutcomeLabel(round.outcome));

  if (options.animate && elements.rpsStage) {
    elements.rpsStage.classList.remove('is-animating');
    void elements.rpsStage.offsetWidth;
    elements.rpsStage.classList.add('is-animating');
    setTimeout(() => {
      elements.rpsStage?.classList.remove('is-animating');
    }, 230);
  }
}

function updateSpeedLabel() {
  if (!elements.speedValue) return;
  elements.speedValue.textContent = `${speedMultiplier.toFixed(1)}x`;
}

function currentStepInterval() {
  return tickDurationMs / speedMultiplier;
}

function hideOverlay() {
  if (!elements.overlay) return;
  elements.overlay.classList.add('hidden');
  elements.overlay.classList.remove('is-rejected', 'is-success', 'is-defeat', 'is-draw');
}

function showOverlay(title, message, options = {}) {
  if (!elements.overlay) return;

  const normalized = options && typeof options === 'object' ? options : {};
  const rejected = Boolean(normalized.rejected);
  const success = Boolean(normalized.success);
  const defeat = Boolean(normalized.defeat);
  const draw = Boolean(normalized.draw);

  if (elements.overlayTitle) elements.overlayTitle.textContent = title;
  if (elements.overlayMessage) elements.overlayMessage.textContent = message;

  elements.overlay.classList.remove('hidden');
  elements.overlay.classList.remove('is-rejected', 'is-success', 'is-defeat', 'is-draw');

  if (rejected) {
    elements.overlay.classList.add('is-rejected');
  } else if (success) {
    elements.overlay.classList.add('is-success');
  } else if (defeat) {
    elements.overlay.classList.add('is-defeat');
  } else if (draw) {
    elements.overlay.classList.add('is-draw');
  }
}

function setPlaybackControls(state) {
  const disable = (element, disabled) => {
    if (element) element.disabled = disabled;
  };

  if (state === 'playing') {
    disable(elements.btnPlay, true);
    disable(elements.btnPause, false);
    disable(elements.btnReset, false);
    disable(elements.loadSimulation, true);
    disable(elements.simulationSelector, true);
    return;
  }

  if (state === 'stopped') {
    disable(elements.btnPlay, rounds.length === 0);
    disable(elements.btnPause, true);
    disable(elements.btnReset, rounds.length === 0);
    disable(elements.loadSimulation, false);
    disable(elements.simulationSelector, false);
    return;
  }

  if (state === 'paused') {
    disable(elements.btnPlay, false);
    disable(elements.btnPause, true);
    disable(elements.btnReset, false);
    disable(elements.loadSimulation, true);
    disable(elements.simulationSelector, true);
    return;
  }

  disable(elements.btnPlay, true);
  disable(elements.btnPause, true);
  disable(elements.btnReset, true);
  disable(elements.loadSimulation, false);
  disable(elements.simulationSelector, false);
}

function stopPlayback() {
  isPlaying = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function resolveJudgeMessage(judge) {
  if (judge && typeof judge.reason === 'string' && judge.reason.trim().length) {
    return judge.reason.trim();
  }
  return t('rps.overlay.play_generated', 'Press Play to replay the generated duel.');
}

function formatMatchOutcome(outcome) {
  if (outcome === 'success') return t('rps.match.player_wins', 'Player wins');
  if (outcome === 'defeat') return t('rps.match.bot_wins', 'Bot wins');
  return t('rps.match.draw', 'Draw');
}

function applySimulation(simulationPayload, options = {}) {
  const simulation = normalizeSimulation(simulationPayload);

  currentSimulation = simulation;
  rounds = simulation.rounds;
  tickDurationMs = simulation.meta.tickDurationMs;

  stopPlayback();
  pausedAt = null;
  currentRoundIndex = -1;

  renderIdleState();
  setPlaybackControls('stopped');
  setStateLabel(t('common.ready', 'Ready'));
  setMatchOutcome(formatMatchOutcome(simulation.result.outcome));

  setStatusMessage(options.statusMessage || t('rps.status.sim_loaded', 'Simulation loaded.'));
  showOverlay(
    options.readyTitle || t('rps.overlay.sim_ready', 'Simulation ready'),
    options.readyMessage || t('rps.overlay.play_replay', 'Press Play to start replay.')
  );
}

async function loadSimulation(path) {
  stopPlayback();
  setStatusMessage(t('rps.status.loading_fallback', 'Loading fallback simulation...'));

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Unable to load simulation (${response.status}).`);
    }

    const payload = await response.json();
    applySimulation(payload, {
      readyTitle: t('rps.overlay.fallback_ready', 'Fallback simulation ready'),
      readyMessage: t('rps.overlay.play_replay', 'Press Play to start replay.'),
      statusMessage: t('rps.status.fallback_loaded', 'Fallback simulation loaded.'),
    });
  } catch (error) {
    handleChallengeRejection(error.message || t('rps.error.loading_failed', 'Simulation loading failed.'));
  }
}

async function loadGeneratedSimulation(simulationPayload, judge = null) {
  stopPlayback();
  setStatusMessage(t('rps.status.loading_generated', 'Loading generated simulation...'));

  try {
    applySimulation(simulationPayload, {
      readyTitle: t('rps.overlay.generated_ready', 'Generated simulation ready'),
      readyMessage: resolveJudgeMessage(judge),
      statusMessage: t('rps.status.generated_loaded', 'Generated simulation loaded.'),
    });
  } catch (error) {
    handleChallengeRejection(error.message || t('rps.error.generated_invalid', 'Generated simulation is invalid.'));
  }
}

function handleChallengeRejection(reason) {
  stopPlayback();

  currentSimulation = null;
  rounds = [];
  currentRoundIndex = -1;
  pausedAt = null;
  tickDurationMs = DEFAULT_TICK_DURATION_MS;

  renderIdleState();
  setPlaybackControls('no-simulation');
  setStateLabel(t('common.rejected', 'Rejected'));
  setLastResult(t('common.rejected', 'Rejected'));
  setMatchOutcome(t('common.rejected', 'Rejected'));
  setStatusMessage(DEFAULT_REJECTION_MESSAGE());

  showOverlay(
    t('rps.overlay.rejected_title', 'Simulation rejected'),
    reason || DEFAULT_REJECTION_MESSAGE(),
    { rejected: true }
  );
}

function finishPlayback() {
  stopPlayback();
  setPlaybackControls('stopped');

  const summary = currentSimulation?.result || computeMatchSummary(rounds);
  const outcome = summary.outcome || 'draw';
  const reason = summary.reason || t('rps.match.finished', 'Match finished.');

  setStateLabel(t('common.finished', 'Finished'));
  setStatusMessage(reason);
  setMatchOutcome(formatMatchOutcome(outcome));

  if (outcome === 'success') {
    showOverlay(t('rps.overlay.congrats', 'Congratulations!'), reason, { success: true });
    return;
  }

  if (outcome === 'defeat') {
    showOverlay(t('rps.match.lost', 'Match lost'), reason, { defeat: true });
    return;
  }

  showOverlay(t('rps.match.draw_title', 'Match draw'), reason, { draw: true });
}

function tickPlayback(timestamp) {
  if (!isPlaying || !rounds.length) return;

  const elapsed = timestamp - roundStartTime;
  const interval = currentStepInterval();

  if (elapsed >= interval) {
    const nextIndex = currentRoundIndex + 1;
    if (nextIndex >= rounds.length) {
      finishPlayback();
      return;
    }

    currentRoundIndex = nextIndex;
    renderRound(currentRoundIndex, { animate: true });
    roundStartTime = timestamp;
  }

  animationFrameId = requestAnimationFrame(tickPlayback);
}

function play() {
  if (!rounds.length) {
    showOverlay(
      t('rps.overlay.no_sim_title', 'No simulation'),
      t('rps.overlay.no_sim_message', 'Generate or load a simulation before pressing Play.')
    );
    return;
  }

  if (isPlaying) return;

  if (currentRoundIndex >= rounds.length - 1) {
    currentRoundIndex = -1;
    renderIdleState();
  }

  const now = performance.now();

  if (pausedAt) {
    roundStartTime += now - pausedAt;
    pausedAt = null;
  } else {
    if (currentRoundIndex < 0) {
      currentRoundIndex = 0;
      renderRound(currentRoundIndex, { animate: true });
    }
    roundStartTime = now;
  }

  isPlaying = true;
  setPlaybackControls('playing');
  setStateLabel(t('rps.status.playing_label', 'Playing'));
  setStatusMessage(t('rps.status.playing', 'Playing generated simulation...'));
  hideOverlay();

  animationFrameId = requestAnimationFrame(tickPlayback);
}

function pause() {
  if (!isPlaying) return;

  stopPlayback();
  pausedAt = performance.now();
  setPlaybackControls('paused');
  setStateLabel(t('common.pause', 'Paused'));
  setStatusMessage(t('rps.status.paused', 'Replay paused.'));
  showOverlay(t('common.pause', 'Paused'), t('rps.overlay.resume', 'Press Play to continue replay.'));
}

function reset() {
  if (!rounds.length) return;

  stopPlayback();
  pausedAt = null;
  currentRoundIndex = -1;

  renderIdleState();
  setPlaybackControls('stopped');
  setStateLabel(t('common.ready', 'Ready'));
  setLastResult(t('common.waiting', 'Waiting'));
  setMatchOutcome(formatMatchOutcome(currentSimulation?.result?.outcome || 'draw'));
  setStatusMessage(t('rps.status.replay_reset', 'Replay reset.'));
  showOverlay(t('rps.overlay.replay_reset_title', 'Replay reset'), t('rps.overlay.start_again', 'Press Play to start again.'));
}

function setupPlaygroundBridge() {
  const handler = async (event) => {
    const payload = event?.data;
    if (!payload || typeof payload !== 'object') return;

    if (payload.type === 'rock-paper-scissors-simulation-generated') {
      if (!payload.simulation || typeof payload.simulation !== 'object') return;
      await loadGeneratedSimulation(payload.simulation, payload.judge || null);
      return;
    }

    if (payload.type === 'rock-paper-scissors-simulation-rejected') {
      const reason = typeof payload.reason === 'string' && payload.reason.trim().length
        ? payload.reason.trim()
        : (payload?.judge?.reason || DEFAULT_REJECTION_MESSAGE());
      handleChallengeRejection(reason);
    }
  };

  window.addEventListener('message', handler);
}

function bindEvents() {
  elements.btnPlay?.addEventListener('click', play);
  elements.btnPause?.addEventListener('click', pause);
  elements.btnReset?.addEventListener('click', reset);

  elements.loadSimulation?.addEventListener('click', () => {
    const path = elements.simulationSelector?.value;
    if (path) loadSimulation(path);
  });

  elements.speedSlider?.addEventListener('input', (event) => {
    speedMultiplier = parseFloat(event.target.value || '1') || 1;
    updateSpeedLabel();
    if (isPlaying) {
      roundStartTime = performance.now();
    }
  });

  window.addEventListener('arena:languagechange', () => {
    if (currentRoundIndex >= 0 && currentRoundIndex < rounds.length) {
      renderRound(currentRoundIndex, { animate: false });
    } else {
      renderIdleState();
    }

    if (rounds.length) {
      setMatchOutcome(formatMatchOutcome(currentSimulation?.result?.outcome || 'draw'));
    } else {
      setMatchOutcome(t('common.pending', 'Pending'));
    }
  });
}

function initialize() {
  setupPlaygroundBridge();
  bindEvents();

  updateSpeedLabel();
  renderIdleState();
  setPlaybackControls('no-simulation');
  setStateLabel(t('common.idle', 'Idle'));
  setMatchOutcome(t('common.pending', 'Pending'));
  setStatusMessage(t('rps.overlay.start_short', 'Write code and press Run to generate a simulation.'));

  showOverlay(
    t('rps.title', 'Rock Paper Scissors Duel'),
    t('rps.overlay.start', 'Write code and press Run to generate a simulation, then press Play to replay it.')
  );
}

window.addEventListener('DOMContentLoaded', initialize);



