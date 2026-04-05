/* ═══════════════════════════════════════════════════════════
   AlgoArena — Execution route (legacy HTTP batch)
   POST /api/execute — kept for backward compat and game sims
   ═══════════════════════════════════════════════════════════ */

'use strict';

const { Router } = require('express');
const config = require('../config');
const { executeBatch } = require('../services/CodeRunner');
const { isNonEmptyString, sanitizeRelativePath } = require('../utils/helpers');
const {
  resolveSnakeExecutionConfig,
  withRandomSnakeStart,
  buildSnakeStdinContract,
  buildSnakeExecutionResult,
  validateSnakeSubmission,
} = require('../features/snake');
const {
  generateRandomLabyrinthConfig,
  buildLabyrinthStdinContract,
  buildLabyrinthExecutionResult,
} = require('../features/labyrinth');
const {
  generateRandomTreasureConfig,
  buildTreasureStdinContract,
  buildTreasureExecutionResult,
} = require('../features/treasure');
const {
  generateRandomRockPaperScissorsConfig,
  buildRockPaperScissorsStdinContract,
  buildRockPaperScissorsExecutionResult,
} = require('../features/rockPaperScissors');
const log = require('../utils/logger');

const router = Router();

router.post('/execute', async (req, res) => {
  const { language, code, files, entryFile, stdin, mode, snakeConfig } = req.body || {};

  /* Validate language */
  if (!isNonEmptyString(language) || !config.SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({ success: false, stdout: '', stderr: 'Missing or unsupported language.' });
  }

  /* Normalize files */
  const normalizedFiles = _normalizeFiles(language, code, files);
  if (!normalizedFiles) {
    return res.status(400).json({ success: false, stdout: '', stderr: 'Missing code or files.' });
  }

  /* Resolve entry file */
  const resolvedEntry = _resolveEntry(language, entryFile, normalizedFiles);

  /* Resolve mode + stdin */
  const executionMode = normalizeExecutionMode(mode);
  let stdinText = _normalizeStdin(stdin);
  let resolvedSnakeConfig = null;
  let resolvedLabyrinthConfig = null;
  let resolvedTreasureConfig = null;
  let resolvedRockPaperScissorsConfig = null;

  if (executionMode === 'snake') {
    // Snake mode overrides stdin using challenge grid/start configuration.
    const configResult = resolveSnakeExecutionConfig(snakeConfig);
    if (!configResult.success) {
      return res.status(400).json({ success: false, stdout: '', stderr: configResult.error });
    }
    resolvedSnakeConfig = withRandomSnakeStart(configResult.config);
    stdinText = buildSnakeStdinContract(resolvedSnakeConfig);
  }

  if (executionMode === 'labyrinth') {
    // Labyrinth mode always injects a fresh randomized maze.
    resolvedLabyrinthConfig = generateRandomLabyrinthConfig();
    stdinText = buildLabyrinthStdinContract(resolvedLabyrinthConfig);
  }

  if (executionMode === 'treasure') {
    // Treasure mode always injects a fresh randomized coin distribution.
    resolvedTreasureConfig = generateRandomTreasureConfig();
    stdinText = buildTreasureStdinContract(resolvedTreasureConfig);
  }

  if (executionMode === 'rock-paper-scissors') {
    // Rock Paper Scissors mode injects a randomized round count.
    resolvedRockPaperScissorsConfig = generateRandomRockPaperScissorsConfig();
    stdinText = buildRockPaperScissorsStdinContract(resolvedRockPaperScissorsConfig);
  }

  log.info('HTTP execute', {
    language,
    mode: executionMode,
    filesCount: normalizedFiles.length,
    entryFile: resolvedEntry,
    stdinBytes: Buffer.byteLength(stdinText, 'utf8'),
  });

  try {
    const result = await executeBatch(language, normalizedFiles, resolvedEntry, stdinText);
    const status = result.success ? 200 : 400;

    if (executionMode === 'snake') {
      const payload = {
        ...result,
        mode: 'snake',
        challenge: 'snake',
        snakeConfig: resolvedSnakeConfig,
        stdinMode: 'auto',
        injectedStdin: stdinText,
      };

      if (result.success === true) {
        // Execution can succeed while simulation is rejected for pedagogical rules.
        const submissionValidation = validateSnakeSubmission({
          language,
          files: normalizedFiles,
          entryFile: resolvedEntry,
          stdout: result.stdout || '',
        });
        payload.snakeValidation = submissionValidation;

        if (!submissionValidation.accepted) {
          payload.snakeSimulationRejected = true;
          payload.snakeSimulation = null;
          payload.snakeJudge = {
            status: 'submission_rejected',
            code: submissionValidation.code,
            reason: submissionValidation.message,
            parsedMoves: 0,
            executedMoves: 0,
            failedTurn: null,
            finalPosition: { ...resolvedSnakeConfig.startPosition },
            visitedCells: 1,
          };
          return res.status(status).json(payload);
        }

        // Only accepted snake submissions are converted into judge + simulation.
        const snakeExecution = buildSnakeExecutionResult(result.stdout || '', resolvedSnakeConfig);
        payload.snakeConfig = snakeExecution.config;
        payload.snakeJudge = snakeExecution.judge;
        payload.snakeSimulation = snakeExecution.simulation;
      }

      return res.status(status).json(payload);
    }

    if (executionMode === 'labyrinth') {
      const payload = {
        ...result,
        mode: 'labyrinth',
        challenge: 'labyrinth',
        labyrinthConfig: resolvedLabyrinthConfig,
        stdinMode: 'auto',
        injectedStdin: stdinText,
      };

      if (result.success === true) {
        const labyrinthExecution = buildLabyrinthExecutionResult(result.stdout || '', resolvedLabyrinthConfig);
        payload.labyrinthConfig = labyrinthExecution.config;
        payload.labyrinthJudge = labyrinthExecution.judge;
        payload.labyrinthSimulation = labyrinthExecution.simulation;
        payload.labyrinthSimulationRejected = labyrinthExecution.rejected === true;
      }

      return res.status(status).json(payload);
    }

    if (executionMode === 'treasure') {
      const payload = {
        ...result,
        mode: 'treasure',
        challenge: 'treasure',
        treasureConfig: resolvedTreasureConfig,
        stdinMode: 'auto',
        injectedStdin: stdinText,
      };

      if (result.success === true) {
        const treasureExecution = buildTreasureExecutionResult(result.stdout || '', resolvedTreasureConfig);
        payload.treasureConfig = treasureExecution.config;
        payload.treasureJudge = treasureExecution.judge;
        payload.treasureSimulation = treasureExecution.simulation;
        payload.treasureSimulationRejected = treasureExecution.rejected === true;
      }

      return res.status(status).json(payload);
    }

    if (executionMode === 'rock-paper-scissors') {
      const payload = {
        ...result,
        mode: 'rock-paper-scissors',
        challenge: 'rock-paper-scissors',
        rockPaperScissorsConfig: resolvedRockPaperScissorsConfig,
        stdinMode: 'auto',
        injectedStdin: stdinText,
      };

      if (result.success === true) {
        const rpsExecution = buildRockPaperScissorsExecutionResult(
          result.stdout || '',
          resolvedRockPaperScissorsConfig
        );
        payload.rockPaperScissorsConfig = rpsExecution.config;
        payload.rockPaperScissorsJudge = rpsExecution.judge;
        payload.rockPaperScissorsSimulation = rpsExecution.simulation;
        payload.rockPaperScissorsSimulationRejected = rpsExecution.rejected === true;
      }

      return res.status(status).json(payload);
    }

    return res.status(status).json(result);
  } catch (err) {
    log.error('HTTP execute error', { message: err.message });
    return res.status(500).json({ success: false, stdout: '', stderr: 'Unexpected server error.' });
  }
});

module.exports = router;

/* ─── Helpers ─── */

function _normalizeFiles(language, code, files) {
  const defaultEntry = config.DEFAULT_ENTRY[language] || 'main.txt';

  if (Array.isArray(files) && files.length > 0) {
    const out = [];
    for (const f of files) {
      if (!f || typeof f !== 'object') continue;
      const name = sanitizeRelativePath(typeof f.name === 'string' ? f.name : '');
      if (!name) continue;
      const content = typeof f.content === 'string' ? f.content : (typeof f.code === 'string' ? f.code : '');
      if (Buffer.byteLength(content, 'utf8') > config.MAX_FILE_SIZE) continue;
      out.push({ name, content });
      if (out.length >= config.MAX_FILES) break;
    }
    return out.length ? out : null;
  }

  if (isNonEmptyString(code)) {
    return [{ name: defaultEntry, content: code }];
  }

  return null;
}

function _resolveEntry(language, entryFile, files) {
  const defaultEntry = config.DEFAULT_ENTRY[language] || 'main.txt';
  const candidate = entryFile ? sanitizeRelativePath(entryFile) : null;
  const names = new Set(files.map((f) => f.name));
  if (candidate && names.has(candidate)) return candidate;
  if (names.has(defaultEntry)) return defaultEntry;
  return files[0].name;
}

function _normalizeStdin(value) {
  if (typeof value !== 'string' || !value.length) return '';
  const trimmed = value.slice(0, 8192);
  return trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`;
}

function normalizeExecutionMode(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'snake') return 'snake';
  if (normalized === 'labyrinth') return 'labyrinth';
  if (normalized === 'treasure') return 'treasure';
  if (
    normalized === 'rock-paper-scissors'
    || normalized === 'rock_paper_scissors'
    || normalized === 'rockpaperscissors'
    || normalized === 'rps'
  ) {
    return 'rock-paper-scissors';
  }
  return 'run';
}
