const VALID_MOVE_TOKENS = new Set([
  '1',
  '2',
  '3',
  'LEFT',
  'RIGHT',
  'CENTER',
  'CENTRE',
  'L',
  'R',
  'C',
]);

function toSafeInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function readCoinValue(row, key, fallback = null) {
  if (Array.isArray(row)) {
    const map = { left: 0, center: 1, right: 2 };
    const idx = map[key];
    return toSafeInt(row?.[idx]);
  }
  if (row && typeof row === 'object') {
    return toSafeInt(row[key]);
  }
  return fallback;
}

function validateTreasureSimulation(sim) {
  const errors = [];

  if (!sim || typeof sim !== 'object') {
    return { ok: false, errors: ['Simulation JSON is empty or invalid.'] };
  }

  const meta = sim.meta && typeof sim.meta === 'object' ? sim.meta : null;
  const steps = Array.isArray(sim.steps) ? sim.steps : null;
  const lanes = Array.isArray(meta?.lanes) ? meta.lanes : ['left', 'center', 'right'];

  if (!meta) {
    errors.push("Missing 'meta' field.");
  } else {
    if (!Array.isArray(meta.lanes) || meta.lanes.length < 3) {
      errors.push("'meta.lanes' must include at least 3 lanes (left, center, right).");
    }
    if (meta.length != null && !Number.isInteger(Number(meta.length))) {
      errors.push("'meta.length' must be an integer when provided.");
    }
  }

  if (!steps || steps.length === 0) {
    errors.push("'steps' must be a non-empty array.");
  }

  const expectedLength = Number.isInteger(Number(meta?.length)) ? Number(meta.length) : (steps ? steps.length : 0);

  if (steps && expectedLength > 0 && steps.length !== expectedLength) {
    errors.push(`'steps' length (${steps.length}) must match meta.length (${expectedLength}).`);
  }

  if (steps) {
    steps.forEach((step, i) => {
      if (!step || typeof step !== 'object') {
        errors.push(`Step ${i}: step must be an object.`);
        return;
      }

      const rawMove = step.move != null ? step.move : step.code;
      const moveToken = String(rawMove == null ? '' : rawMove).trim().toUpperCase();
      if (!VALID_MOVE_TOKENS.has(moveToken)) {
        errors.push(`Step ${i}: move '${rawMove}' is unknown (allowed: 1, 2, 3).`);
      }

      if (step.toLane != null) {
        const lane = toSafeInt(step.toLane);
        if (lane == null || lane < 0 || lane > 2) {
          errors.push(`Step ${i}: toLane must be 0, 1 or 2.`);
        }
      }
    });
  }

  if (sim.coinRows != null) {
    if (!Array.isArray(sim.coinRows)) {
      errors.push("'coinRows' must be an array when provided.");
    } else {
      if (expectedLength > 0 && sim.coinRows.length !== expectedLength) {
        errors.push(`'coinRows' length (${sim.coinRows.length}) must match step count (${expectedLength}).`);
      }

      sim.coinRows.forEach((row, i) => {
        const left = readCoinValue(row, 'left');
        const center = readCoinValue(row, 'center');
        const right = readCoinValue(row, 'right');
        if (left == null || center == null || right == null) {
          errors.push(`coinRows[${i}] must define integer left/center/right values.`);
          return;
        }
        if (left < 0 || center < 0 || right < 0) {
          errors.push(`coinRows[${i}] values must be >= 0.`);
        }
      });
    }
  }

  if (sim.result != null && typeof sim.result === 'object') {
    const outcome = String(sim.result.outcome || '').trim().toLowerCase();
    if (outcome && !['success', 'partial', 'fail'].includes(outcome)) {
      errors.push("result.outcome must be one of: success, partial, fail.");
    }
  }

  if (!Array.isArray(lanes) || lanes.length < 3) {
    errors.push("Treasure simulation must expose at least 3 lanes.");
  }

  return { ok: errors.length === 0, errors };
}

window.validateTreasureSimulation = validateTreasureSimulation;