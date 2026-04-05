// Treasure Run challenge replay with integrated playground bridge.

const canvas = document.getElementById('treasureCanvas');
const ctx = canvas?.getContext('2d');

const statusEl = document.getElementById('status');
const stepCounterEl = document.getElementById('stepCounter');
const stateLabelEl = document.getElementById('stateLabel');
const coinCounterEl = document.getElementById('coinCounter');

const overlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const celebrationLayer = document.getElementById('celebrationLayer');

const simulationSelector = document.getElementById('simulationSelector');
const btnLoad = document.getElementById('btnLoad');
const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

const LANE_NAMES = Object.freeze(['left', 'center', 'right']);
const t = (key, fallback = '') => {
  if (window.ArenaI18n && typeof window.ArenaI18n.t === 'function') {
    return window.ArenaI18n.t(key, fallback);
  }
  return fallback || key;
};

const baseTickDuration = 950;
let speedMultiplier = parseFloat(speedSlider?.value || '1');
let runData = null;
let steps = [];
let currentStepIndex = 0;
let isPlaying = false;
let animationId = null;
let stepStartTime = 0;
let lastProgress = 0;
let pausedAt = null;
let activeCoins = [];
let collectedCoins = 0;
let missedCoins = 0;

let playgroundMessageHandler = null;

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

function toNonNegativeInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return parsed;
}

function laneToIndex(name, lanes = LANE_NAMES) {
  if (typeof name === 'number' && Number.isInteger(name)) {
    if (name >= 1 && name <= 3) return name - 1;
    if (name >= 0 && name <= 2) return name;
  }

  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) return 1;

  if (normalized === '1' || normalized === 'left' || normalized === 'l') return 0;
  if (normalized === '2' || normalized === 'center' || normalized === 'centre' || normalized === 'c') return 1;
  if (normalized === '3' || normalized === 'right' || normalized === 'r') return 2;

  const idx = lanes.findIndex((lane) => {
    const token = String(lane || '').toLowerCase();
    return (
      token === normalized
      || (token.startsWith('g') && normalized.startsWith('g'))
      || (token.startsWith('c') && normalized.startsWith('c'))
      || (token.startsWith('d') && normalized.startsWith('d'))
    );
  });

  return idx >= 0 ? idx : 1;
}

function moveTokenToLane(token, fallbackLane = 1) {
  const normalized = String(token ?? '').trim().toUpperCase();
  if (!normalized) return fallbackLane;

  if (normalized === '1' || normalized === 'LEFT' || normalized === 'L') return 0;
  if (normalized === '2' || normalized === 'CENTER' || normalized === 'CENTRE' || normalized === 'C') return 1;
  if (normalized === '3' || normalized === 'RIGHT' || normalized === 'R') return 2;

  return fallbackLane;
}

function laneToMoveToken(index) {
  return index === 0 ? 'LEFT' : index === 2 ? 'RIGHT' : 'CENTER';
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function setStateLabel(value) {
  if (stateLabelEl) stateLabelEl.textContent = value;
}

function updateStepCounter() {
  if (!stepCounterEl) return;
  const total = steps.length;
  if (total === 0) {
    stepCounterEl.textContent = '0 / 0';
    return;
  }

  const current = isPlaying
    ? Math.min(currentStepIndex + 1, total)
    : Math.min(currentStepIndex, total);
  stepCounterEl.textContent = `${current} / ${total}`;
}

function updateCoinCounter() {
  if (coinCounterEl) {
    coinCounterEl.textContent = `${collectedCoins} / ${collectedCoins + missedCoins}`;
  }
}

function updateButtons() {
  const hasData = steps.length > 0;
  if (btnPlay) btnPlay.disabled = !hasData;
  if (btnPause) btnPause.disabled = !hasData || !isPlaying;
  if (btnReset) btnReset.disabled = !hasData;
}

function currentInterval() {
  return baseTickDuration / speedMultiplier;
}

function resizeCanvas() {
  const container = document.querySelector('.challenge-game-column .canvas-container')
    || document.querySelector('.canvas-container');
  if (!container || !canvas) return;
  canvas.width = Math.max(320, container.clientWidth - 12);
  canvas.height = Math.max(260, container.clientHeight - 12);
  renderCurrentFrame();
}

window.addEventListener('resize', resizeCanvas);

function buildFallbackCoinRows(totalSteps) {
  const template = [
    { left: 0, center: 3, right: 0 },
    { left: 0, center: 5, right: 0 },
    { left: 0, center: 0, right: 0 },
    { left: 0, center: 0, right: 2 },
    { left: 0, center: 0, right: 6 },
    { left: 0, center: 0, right: 0 },
    { left: 0, center: 2, right: 0 },
    { left: 0, center: 0, right: 0 },
    { left: 5, center: 0, right: 0 },
    { left: 4, center: 0, right: 0 },
    { left: 0, center: 0, right: 0 },
    { left: 0, center: 3, right: 0 },
  ];

  const rows = [];
  for (let i = 0; i < totalSteps; i += 1) {
    const row = { ...template[i % template.length] };
    const total = (row.left || 0) + (row.center || 0) + (row.right || 0);
    if (total > 0) {
      row.left = row.left || 1;
      row.center = row.center || 1;
      row.right = row.right || 1;
    }
    rows.push({
      left: toNonNegativeInt(row.left, 0),
      center: toNonNegativeInt(row.center, 0),
      right: toNonNegativeInt(row.right, 0),
    });
  }

  return rows;
}

function normalizeCoinRow(rawRow, fallbackRow) {
  if (Array.isArray(rawRow)) {
    return {
      left: toNonNegativeInt(rawRow[0], fallbackRow.left),
      center: toNonNegativeInt(rawRow[1], fallbackRow.center),
      right: toNonNegativeInt(rawRow[2], fallbackRow.right),
    };
  }

  if (rawRow && typeof rawRow === 'object') {
    return {
      left: toNonNegativeInt(rawRow.left, fallbackRow.left),
      center: toNonNegativeInt(rawRow.center, fallbackRow.center),
      right: toNonNegativeInt(rawRow.right, fallbackRow.right),
    };
  }

  return { ...fallbackRow };
}

function normalizeCoinRows(sim, stepCount) {
  const fallbackRows = buildFallbackCoinRows(stepCount);
  const sourceRows = Array.isArray(sim.coinRows) ? sim.coinRows : null;

  return Array.from({ length: stepCount }, (_, index) => {
    const fallback = fallbackRows[index] || { left: 0, center: 0, right: 0 };
    const rawFromTopLevel = sourceRows ? sourceRows[index] : null;
    const rawFromStep = sim.steps?.[index]?.coins || null;
    const raw = rawFromTopLevel ?? rawFromStep;
    return normalizeCoinRow(raw, fallback);
  });
}

function buildCoinsForRow(row, stepIndex) {
  const clusterCoins = [];
  ['left', 'center', 'right'].forEach((laneName, laneIdx) => {
    const count = row[laneName] || 0;
    const baseDelay = 0.05;
    for (let c = 0; c < count; c += 1) {
      clusterCoins.push({
        id: `coin-${stepIndex}-${laneIdx}-${c}`,
        lane: laneIdx,
        delay: clamp(baseDelay * c, 0, 0.9),
        value: 1,
        spawned: false,
        spawnTime: 0,
        collected: false,
        magnetized: false,
        magnetStart: 0,
      });
    }
  });

  return clusterCoins;
}

function normalizeSteps(sim) {
  const lanes = Array.isArray(sim.meta?.lanes) ? sim.meta.lanes : LANE_NAMES;
  const metaLength = Number.isInteger(Number(sim.meta?.length)) ? Number(sim.meta.length) : 0;
  const stepsLength = Array.isArray(sim.steps) ? sim.steps.length : 0;
  const coinRowsLength = Array.isArray(sim.coinRows) ? sim.coinRows.length : 0;
  const stepCount = Math.max(metaLength, stepsLength, coinRowsLength, 1);

  const startLane = laneToIndex(sim.meta?.startLane ?? sim.player?.startLane ?? 2, lanes);
  const coinRows = normalizeCoinRows(sim, stepCount);

  const built = [];
  for (let i = 0; i < stepCount; i += 1) {
    const rawStep = sim.steps?.[i] || {};
    const fromLane = i === 0 ? startLane : built[i - 1].toLane;

    let toLane = Number.isInteger(rawStep.toLane)
      ? clamp(rawStep.toLane, 0, 2)
      : moveTokenToLane(rawStep.move ?? rawStep.action ?? rawStep.code, fromLane);

    if (!Number.isInteger(toLane)) toLane = fromLane;

    built.push({
      t: typeof rawStep.t === 'number' ? rawStep.t : i,
      note: rawStep.note || rawStep.label || null,
      code: toLane + 1,
      move: laneToMoveToken(toLane),
      fromLane,
      toLane,
      coins: buildCoinsForRow(coinRows[i], i),
    });
  }

  return built;
}

function resolveJudgeMessage(judge) {
  if (judge && typeof judge.reason === 'string' && judge.reason.trim().length) {
    return judge.reason.trim();
  }
  return t('treasure.overlay.play_generated', 'Press Play to replay the generated run.');
}

function applySimulation(data, options = {}) {
  const validation = window.validateTreasureSimulation?.(data) || { ok: true, errors: [] };
  if (!validation.ok) {
    throw new Error(validation.errors.join(' | '));
  }

  runData = data;
  steps = normalizeSteps(data);
  resetPlayback();

  const readyTitle = options.readyTitle || t('treasure.overlay.sim_ready', 'Simulation ready');
  const readyMessage = options.readyMessage || t('treasure.overlay.play_replay', 'Press Play to start replay.');
  showOverlay(readyTitle, readyMessage);

  setStatus(options.statusMessage || t('treasure.status.sim_ready', 'Simulation ready.'));
  setStateLabel(t('common.ready', 'Ready'));
  updateButtons();
  updateStepCounter();
}

async function loadSimulation(path) {
  setStatus(t('common.loading', 'Loading...'));

  try {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`Unable to load simulation (${res.status})`);
    }
    const data = await res.json();
    applySimulation(data, {
      readyTitle: t('treasure.overlay.fallback_ready', 'Fallback simulation ready'),
      readyMessage: t('treasure.overlay.play_replay', 'Press Play to start replay.'),
      statusMessage: t('treasure.status.fallback_loaded', 'Fallback simulation loaded.'),
    });
  } catch (err) {
    runData = null;
    steps = [];
    showOverlay(t('treasure.overlay.load_error', 'Load error'), err.message || t('treasure.overlay.read_error', 'Unable to read the simulation.'), { rejected: true });
    setStatus(err.message || t('treasure.status.load_failed', 'Simulation load failed.'));
    setStateLabel(t('common.error', 'Error'));
    updateButtons();
    updateStepCounter();
  }
}

async function loadGeneratedSimulation(simulationData, judge = null) {
  setStatus(t('treasure.overlay.loading_generated', 'Loading generated simulation...'));

  try {
    applySimulation(simulationData, {
      readyTitle: t('treasure.overlay.generated_ready', 'Generated simulation ready'),
      readyMessage: resolveJudgeMessage(judge),
      statusMessage: t('treasure.status.generated_loaded', 'Generated simulation loaded.'),
    });
  } catch (error) {
    handleChallengeRejection(error.message || 'Generated simulation is invalid.');
  }
}

function setupPlaygroundBridge() {
  if (playgroundMessageHandler) {
    window.removeEventListener('message', playgroundMessageHandler);
  }

  playgroundMessageHandler = async (event) => {
    const payload = event?.data;
    if (!payload || typeof payload !== 'object') return;

    if (payload.type === 'treasure-simulation-generated') {
      if (!payload.simulation || typeof payload.simulation !== 'object') return;
      await loadGeneratedSimulation(payload.simulation, payload.judge || null);
      return;
    }

    if (payload.type === 'treasure-simulation-rejected') {
      const reason = typeof payload.reason === 'string' && payload.reason.trim().length
        ? payload.reason.trim()
        : (payload?.judge?.reason || t('common.submission_rejected', 'Submission rejected by challenge rules.'));
      handleChallengeRejection(reason);
    }
  };

  window.addEventListener('message', playgroundMessageHandler);
}

function clearCelebration() {
  celebrationLayer?.classList.remove('active');
  if (celebrationLayer) celebrationLayer.innerHTML = '';
}

function triggerCelebration() {
  if (!celebrationLayer) return;
  clearCelebration();
  celebrationLayer.classList.add('active');

  const frag = document.createDocumentFragment();
  for (let i = 0; i < 80; i += 1) {
    const span = document.createElement('span');
    span.className = 'confetti-piece';
    if (i % 3 === 0) span.classList.add('alt');
    if (i % 5 === 0) span.classList.add('warm');
    span.style.left = `${Math.random() * 100}%`;
    span.style.animationDuration = `${1.2 + Math.random() * 1.4}s`;
    span.style.animationDelay = `${Math.random() * 0.25}s`;
    frag.appendChild(span);
  }

  for (let i = 0; i < 4; i += 1) {
    const fw = document.createElement('div');
    fw.className = 'firework';
    fw.style.left = `${20 + Math.random() * 60}%`;
    fw.style.top = `${20 + Math.random() * 40}%`;
    fw.style.animationDelay = `${0.2 * i}s`;
    frag.appendChild(fw);
  }

  celebrationLayer.appendChild(frag);
  setTimeout(clearCelebration, 2600);
}

function showOverlay(title, message, options = {}) {
  if (!overlay) return;

  const normalizedOptions = typeof options === 'boolean'
    ? { rejected: options }
    : (options && typeof options === 'object' ? options : {});

  const isRejected = Boolean(normalizedOptions.rejected);
  const isSuccess = Boolean(normalizedOptions.success);

  if (overlayTitle) overlayTitle.textContent = title;
  if (overlayMessage) overlayMessage.textContent = message;

  overlay.classList.remove('hidden');
  overlay.classList.remove('is-rejected', 'is-success');
  if (isRejected) {
    overlay.classList.add('is-rejected');
  } else if (isSuccess) {
    overlay.classList.add('is-success');
  }
}

function hideOverlay() {
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.classList.remove('is-rejected', 'is-success');
}

function handleChallengeRejection(reason) {
  cancelAnimationFrame(animationId);
  isPlaying = false;
  runData = null;
  steps = [];
  currentStepIndex = 0;
  activeCoins = [];
  collectedCoins = 0;
  missedCoins = 0;
  updateCoinCounter();
  updateStepCounter();
  updateButtons();
  setStateLabel(t('common.rejected', 'Rejected'));
  setStatus(t('common.submission_rejected', 'Submission rejected by challenge rules.'));
  showOverlay(
    t('treasure.overlay.rejected_title', 'Simulation rejected'),
    reason || t('treasure.overlay.rejected_message', 'The generated run was rejected.'),
    { rejected: true }
  );
  renderCurrentFrame();
}

function showOutcome(status, message) {
  const isSuccess = status === 'success';
  const title = isSuccess ? t('treasure.overlay.congrats', 'Congratulations!') : t('treasure.overlay.run_ended', 'Run finished');
  showOverlay(title, message || '', { success: isSuccess });
  if (isSuccess) triggerCelebration();
}

function lanePositions(height) {
  const top = height * 0.32;
  const spacing = height * 0.18;
  return [top, top + spacing, top + spacing * 2];
}

function drawBackground(w, h, progress) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(6,10,18,0.95)');
  gradient.addColorStop(0.35, 'rgba(8,12,22,0.95)');
  gradient.addColorStop(1, 'rgba(10,8,14,0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const horizon = ctx.createLinearGradient(0, h * 0.15, 0, h * 0.4);
  horizon.addColorStop(0, 'rgba(255,163,64,0.25)');
  horizon.addColorStop(1, 'rgba(255,163,64,0)');
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 0, w, h * 0.45);

  for (let i = 0; i < 4; i += 1) {
    const lx = (i / 3) * w;
    const ly = h * 0.08;
    const radius = 160;
    const light = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
    light.addColorStop(0, 'rgba(255,193,94,0.18)');
    light.addColorStop(1, 'rgba(255,193,94,0)');
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(lx, ly, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const pulse = 0.15 + Math.sin(progress * Math.PI * 2) * 0.05;
  ctx.fillStyle = `rgba(99, 248, 255, ${pulse})`;
  ctx.fillRect(0, h * 0.82, w, 2);
}

function drawTrack(w, h, positions) {
  const left = w * 0.08;
  const right = w * 0.96;
  const centerY = h * 0.52;
  const pathHeight = h * 0.52;
  const top = centerY - pathHeight / 2;
  const bottom = centerY + pathHeight / 2;

  const asphalt = ctx.createLinearGradient(left, top, right, bottom);
  asphalt.addColorStop(0, 'rgba(30, 32, 38, 0.95)');
  asphalt.addColorStop(1, 'rgba(16, 18, 24, 0.98)');
  ctx.fillStyle = asphalt;

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(right, top + pathHeight * 0.12);
  ctx.lineTo(right, bottom - pathHeight * 0.12);
  ctx.lineTo(left, bottom);
  ctx.closePath();
  ctx.fill();

  ctx.setLineDash([18, 16]);
  ctx.strokeStyle = 'rgba(255,207,96,0.8)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(left + (right - left) * 0.52, top + 6);
  ctx.lineTo(right - 20, bottom - 6);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  positions.forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(left + 10, y);
    ctx.lineTo(right - 10, y - (y - centerY) * 0.08);
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(255,193,94,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(right, top + pathHeight * 0.12);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom - pathHeight * 0.12);
  ctx.stroke();
}

function drawCoins(timeNow, heroX, heroY, w, h, duration) {
  activeCoins.forEach((coin) => {
    if (!coin.spawned) return;

    const elapsed = timeNow - coin.spawnTime;
    const travel = duration * 0.9;
    const coinProgress = clamp(elapsed / travel, 0, 1.2);

    const startX = w * 0.95;
    const endX = heroX + 4;
    let x = startX - coinProgress * (startX - endX);

    const yPositions = lanePositions(h);
    let y = yPositions[coin.lane] || yPositions[1];

    const magnetZoneX = heroX + 140;
    const sameLaneProximity = Math.abs((yPositions[coin.lane] || yPositions[1]) - heroY) < 2;
    if (!coin.magnetized && x <= magnetZoneX && sameLaneProximity) {
      coin.magnetized = true;
      coin.magnetStart = timeNow;
    }

    if (coin.magnetized) {
      const pull = clamp((timeNow - coin.magnetStart) / (duration * 0.5), 0, 1);
      y = lerp(y, heroY, pull * 0.9);
      x = lerp(x, heroX + 6, pull * 0.95);
    }

    const radius = 16 + Math.sin(coinProgress * Math.PI) * 2.4;

    const distY = Math.abs(y - heroY);
    const distX = Math.abs(x - heroX);
    if (!coin.collected && distY < 14 && distX < 26 && coinProgress >= 0.35) {
      coin.collected = true;
      coin.collectTime = performance.now();
      collectedCoins += coin.value;
      updateCoinCounter();
    }

    if (!coin.collected && coinProgress >= 1) {
      coin.collected = 'missed';
      missedCoins += coin.value;
      updateCoinCounter();
    }

    if (coin.collected && coinProgress >= 1.05) return;

    const glow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 2);
    glow.addColorStop(0, 'rgba(255,210,80,0.65)');
    glow.addColorStop(0.6, 'rgba(255,145,0,0.35)');
    glow.addColorStop(1, 'rgba(255,200,87,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    const coinGrad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    coinGrad.addColorStop(0, '#ffd166');
    coinGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = coinGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, Math.PI * 0.12, Math.PI * 1.85);
    ctx.stroke();

    ctx.fillStyle = '#fff5d7';
    ctx.font = '800 14px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + 1);
  });

  activeCoins = activeCoins.filter((coin) => !coin.spawned || timeNow - coin.spawnTime < duration * 1.6);
}

function drawRunner(heroX, heroY, stepProgress) {
  const bounce = Math.sin(stepProgress * Math.PI) * 4;

  const trailGrad = ctx.createLinearGradient(heroX - 90, heroY, heroX, heroY);
  trailGrad.addColorStop(0, 'rgba(255,163,64,0)');
  trailGrad.addColorStop(1, 'rgba(255,163,64,0.38)');
  ctx.fillStyle = trailGrad;
  ctx.beginPath();
  ctx.moveTo(heroX - 110, heroY - 20);
  ctx.lineTo(heroX, heroY - 10);
  ctx.lineTo(heroX, heroY + 10);
  ctx.lineTo(heroX - 110, heroY + 20);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(heroX + 6, heroY + 18, 28, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(heroX - 4, heroY + 16 + bounce);
  ctx.lineTo(heroX - 10, heroY + 28 - bounce);
  ctx.moveTo(heroX + 6, heroY + 16 + bounce * 0.4);
  ctx.lineTo(heroX + 14, heroY + 30 - bounce * 0.6);
  ctx.stroke();

  ctx.fillStyle = '#ffa500';
  ctx.beginPath();
  ctx.ellipse(heroX - 10, heroY + 30 - bounce, 8, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(heroX + 14, heroY + 32 - bounce * 0.6, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(heroX - 18, heroY - 26 + bounce, heroX + 20, heroY + 18 + bounce);
  bodyGrad.addColorStop(0, '#ff7f50');
  bodyGrad.addColorStop(1, '#ffb347');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(heroX, heroY + bounce, 22, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(46, 196, 182, 0.55)';
  ctx.beginPath();
  ctx.ellipse(heroX - 18, heroY + 6 + bounce, 11, 18, 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(heroX, heroY - 24 + bounce, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.arc(heroX, heroY - 26 + bounce, 16, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(heroX - 16, heroY - 26 + bounce, 32, 8);
  ctx.fillStyle = '#082f49';
  ctx.fillRect(heroX - 6, heroY - 18 + bounce, 20, 4);

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(heroX - 5, heroY - 22 + bounce, 2.4, 0, Math.PI * 2);
  ctx.arc(heroX + 5, heroY - 22 + bounce, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(heroX - 18, heroY - 2 + bounce);
  ctx.lineTo(heroX - 36, heroY + 6 - bounce * 0.6);
  ctx.moveTo(heroX + 18, heroY + 2 + bounce);
  ctx.lineTo(heroX + 34, heroY + 10 - bounce * 0.4);
  ctx.stroke();
}

function drawHUD(w, h) {
  ctx.fillStyle = 'rgba(6,11,29,0.55)';
  ctx.fillRect(w - 210, 16, 194, 90);
  ctx.strokeStyle = 'rgba(99,248,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(w - 210, 16, 194, 90);

  ctx.fillStyle = '#aab5e0';
  ctx.font = '600 12px Manrope, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(t('treasure.coins', 'Coins'), w - 196, 38);
  ctx.fillText(t('common.step', 'Step'), w - 196, 62);
  ctx.fillText(t('common.state', 'State'), w - 196, 86);

  ctx.fillStyle = '#f6f8ff';
  ctx.font = '800 20px Manrope, sans-serif';
  ctx.fillText(`${collectedCoins}`, w - 126, 38);
  ctx.fillText(`${Math.min(currentStepIndex, steps.length)}/${Math.max(steps.length, 1)}`, w - 126, 62);
  ctx.fillText(isPlaying ? t('common.play', 'Play') : t('common.pause', 'Pause'), w - 126, 86);
}

function renderCurrentFrame() {
  if (!canvas || !ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const positions = lanePositions(h);

  if (!steps.length) {
    drawBackground(w, h, 0);
    drawTrack(w, h, positions);
    return;
  }

  const step = steps[Math.min(currentStepIndex, steps.length - 1)];
  const duration = currentInterval();
  const now = performance.now();
  const progress = isPlaying ? clamp((now - stepStartTime) / duration, 0, 1) : lastProgress;

  const heroY = lerp(positions[step.fromLane], positions[step.toLane], easeInOut(progress));
  const heroX = w * 0.28;
  const timeNow = isPlaying ? now : stepStartTime + progress * duration;

  drawBackground(w, h, progress);
  drawTrack(w, h, positions);
  drawCoins(timeNow, heroX, heroY, w, h, duration);
  drawRunner(heroX, heroY, progress);
  drawHUD(w, h);
}

function finishStep() {
  currentStepIndex += 1;
  updateStepCounter();

  if (currentStepIndex >= steps.length) {
    isPlaying = false;

    const result = runData?.result && typeof runData.result === 'object' ? runData.result : null;
    const outcome = String(result?.outcome || '').trim().toLowerCase();
    const isSuccess = outcome === 'success';

    const fallbackMessage = `${t('treasure.overlay.run_ended', 'Run finished')}: ${collectedCoins} ${t('treasure.coins', 'Coins').toLowerCase()}.`;
    const message = result?.reason || fallbackMessage;

    showOutcome(isSuccess ? 'success' : 'done', message);
    setStatus(isSuccess ? t('treasure.status.finished_success', 'Simulation finished successfully.') : message);
    setStateLabel(isSuccess ? t('treasure.status.success', 'Success') : t('common.finished', 'Finished'));
    updateButtons();
    return;
  }

  stepStartTime = performance.now();
  lastProgress = 0;

  const newCoins = steps[currentStepIndex]?.coins?.map((c) => ({
    ...c,
    spawned: false,
    spawnTime: 0,
    collected: false,
    magnetized: false,
    magnetStart: 0,
  })) || [];

  activeCoins = [...activeCoins, ...newCoins];
}

function tick() {
  if (!isPlaying || !steps.length) return;

  const now = performance.now();
  const duration = currentInterval();
  const progress = clamp((now - stepStartTime) / duration, 0, 1);
  lastProgress = progress;

  activeCoins.forEach((coin) => {
    if (!coin.spawned && progress >= coin.delay) {
      coin.spawned = true;
      coin.spawnTime = now;
    }
  });

  renderCurrentFrame();

  if (progress >= 1) {
    finishStep();
  }

  if (isPlaying) {
    animationId = requestAnimationFrame(tick);
  }
}

function resetPlayback() {
  cancelAnimationFrame(animationId);
  isPlaying = false;
  currentStepIndex = 0;
  lastProgress = 0;
  collectedCoins = 0;
  missedCoins = 0;
  pausedAt = null;

  activeCoins = steps[0]?.coins?.map((c) => ({
    ...c,
    spawned: false,
    collected: false,
    spawnTime: 0,
    magnetized: false,
    magnetStart: 0,
  })) || [];

  stepStartTime = performance.now();
  setStatus(t('treasure.status.sim_ready', 'Simulation ready.'));
  setStateLabel(t('common.ready', 'Ready'));
  updateStepCounter();
  updateCoinCounter();
  renderCurrentFrame();
  updateButtons();
  hideOverlay();
}

function play() {
  if (!steps.length) {
    showOverlay(
      t('treasure.overlay.no_sim_title', 'No simulation'),
      t('treasure.overlay.no_sim_message', 'Generate or load a simulation before pressing Play.')
    );
    return;
  }

  if (isPlaying) return;

  if (pausedAt) {
    const delta = performance.now() - pausedAt;
    stepStartTime += delta;
    activeCoins = activeCoins.map((coin) => ({
      ...coin,
      spawnTime: coin.spawnTime + delta,
    }));
  } else {
    stepStartTime = performance.now();
  }

  pausedAt = null;
  isPlaying = true;
  setStateLabel(t('treasure.status.playing_label', 'Playing'));
  setStatus(t('treasure.status.playing', 'Playing generated simulation...'));
  updateButtons();
  animationId = requestAnimationFrame(tick);
  hideOverlay();
}

function pause() {
  if (!isPlaying) return;
  isPlaying = false;
  pausedAt = performance.now();
  cancelAnimationFrame(animationId);
  setStateLabel(t('common.pause', 'Paused'));
  setStatus(t('treasure.status.paused', 'Run paused.'));
  updateButtons();
  renderCurrentFrame();
  showOverlay(t('common.pause', 'Paused'), t('treasure.overlay.resume', 'Press Play to resume the simulation.'));
}

btnLoad?.addEventListener('click', () => {
  if (simulationSelector?.value) loadSimulation(simulationSelector.value);
});

btnPlay?.addEventListener('click', play);
btnPause?.addEventListener('click', pause);
btnReset?.addEventListener('click', resetPlayback);

speedSlider?.addEventListener('input', (e) => {
  speedMultiplier = parseFloat(e.target.value);
  if (speedValue) speedValue.textContent = `${speedMultiplier.toFixed(2)}x`;
});

function init() {
  setupPlaygroundBridge();
  resizeCanvas();
  renderCurrentFrame();
  updateButtons();
  updateCoinCounter();
  updateStepCounter();
  if (speedValue) speedValue.textContent = `${speedMultiplier.toFixed(2)}x`;

  setStateLabel(t('common.idle', 'Idle'));
  setStatus(t('treasure.overlay.start_short', 'Write code and press Run to generate a simulation.'));
  showOverlay(
    t('treasure.title', 'Treasure Run'),
    t('treasure.overlay.start', 'Press Play to replay when a simulation is available.')
  );

  window.addEventListener('arena:languagechange', () => {
    renderCurrentFrame();
    if (!steps.length) {
      setStateLabel(t('common.idle', 'Idle'));
      setStatus(t('treasure.overlay.start_short', 'Write code and press Run to generate a simulation.'));
    }
  });
}

window.addEventListener('DOMContentLoaded', init);
