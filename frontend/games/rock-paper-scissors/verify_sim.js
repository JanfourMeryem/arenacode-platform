const VALID_OUTCOMES = new Set(['win', 'loss', 'draw']);
const VALID_MATCH_OUTCOMES = new Set(['success', 'defeat', 'draw']);

function toInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function validateRockPaperScissorsSimulation(simulation) {
  const errors = [];

  if (!simulation || typeof simulation !== 'object') {
    return { ok: false, errors: ['Simulation JSON is empty or invalid.'] };
  }

  const meta = simulation.meta && typeof simulation.meta === 'object' ? simulation.meta : null;
  const rounds = Array.isArray(simulation.rounds) ? simulation.rounds : null;

  if (!meta) {
    errors.push("Missing 'meta' field.");
  } else {
    const roundsCount = toInteger(meta.rounds);
    if (roundsCount == null || roundsCount <= 0) {
      errors.push("'meta.rounds' must be an integer > 0.");
    }

    if (meta.tickDurationMs != null) {
      const tick = toInteger(meta.tickDurationMs);
      if (tick == null || tick <= 0) {
        errors.push("'meta.tickDurationMs' must be a positive integer when provided.");
      }
    }
  }

  if (!rounds || rounds.length === 0) {
    errors.push("'rounds' must be a non-empty array.");
  }

  if (meta && rounds) {
    const roundsCount = toInteger(meta.rounds);
    if (roundsCount != null && roundsCount > 0 && rounds.length !== roundsCount) {
      errors.push(`'rounds' length (${rounds.length}) must match meta.rounds (${roundsCount}).`);
    }
  }

  if (rounds) {
    rounds.forEach((round, index) => {
      if (!round || typeof round !== 'object') {
        errors.push(`Round ${index + 1}: round must be an object.`);
        return;
      }

      const userMove = toInteger(round.userMoveCode ?? round.userMove);
      const botMove = toInteger(round.botMoveCode ?? round.botMove);

      if (!userMove || userMove < 1 || userMove > 3) {
        errors.push(`Round ${index + 1}: invalid user move (expected 1, 2 or 3).`);
      }

      if (!botMove || botMove < 1 || botMove > 3) {
        errors.push(`Round ${index + 1}: invalid bot move (expected 1, 2 or 3).`);
      }

      if (round.outcome != null) {
        const outcome = String(round.outcome).trim().toLowerCase();
        if (!VALID_OUTCOMES.has(outcome)) {
          errors.push(`Round ${index + 1}: outcome must be win, loss or draw.`);
        }
      }
    });
  }

  if (simulation.result != null) {
    if (typeof simulation.result !== 'object') {
      errors.push("'result' must be an object when provided.");
    } else {
      const outcome = String(simulation.result.outcome || '').trim().toLowerCase();
      if (outcome && !VALID_MATCH_OUTCOMES.has(outcome)) {
        errors.push("result.outcome must be success, defeat or draw.");
      }

      ['wins', 'losses', 'draws'].forEach((key) => {
        if (simulation.result[key] != null) {
          const value = toInteger(simulation.result[key]);
          if (value == null || value < 0) {
            errors.push(`result.${key} must be a non-negative integer when provided.`);
          }
        }
      });
    }
  }

  return { ok: errors.length === 0, errors };
}

window.validateRockPaperScissorsSimulation = validateRockPaperScissorsSimulation;