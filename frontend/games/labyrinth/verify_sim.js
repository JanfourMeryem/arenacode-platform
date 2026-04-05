// verify_sim.js
// Vérifie la validité d'un fichier de simulation de labyrinthe

function validateLabyrinthSimulation(sim) {
  const errors = [];

  if (!sim || typeof sim !== "object") {
    errors.push("Le JSON de simulation est vide ou invalide.");
    return { ok: false, errors };
  }

  const { meta, grid, steps } = sim;

  // --- Vérif meta ---
  if (!meta || typeof meta !== "object") {
    errors.push("Champ 'meta' manquant.");
  } else {
    if (typeof meta.rows !== "number" || meta.rows <= 0) {
      errors.push("'meta.rows' doit être un nombre > 0.");
    }
    if (typeof meta.cols !== "number" || meta.cols <= 0) {
      errors.push("'meta.cols' doit être un nombre > 0.");
    }
  }

  // --- Vérif grid ---
  if (!Array.isArray(grid) || grid.length === 0) {
    errors.push("Le champ 'grid' doit être un tableau non vide de chaînes.");
  } else {
    if (meta) {
      if (grid.length !== meta.rows) {
        errors.push(
          `Nombre de lignes incohérent : meta.rows=${meta.rows}, grid.length=${grid.length}`
        );
      }
      grid.forEach((rowStr, r) => {
        if (typeof rowStr !== "string") {
          errors.push(`Ligne ${r} de 'grid' n'est pas une chaîne.`);
          return;
        }
        if (rowStr.length !== meta.cols) {
          errors.push(
            `Longueur de la ligne ${r} incohérente : attendu ${meta.cols}, obtenu ${rowStr.length}`
          );
        }
      });
    }
  }

  // --- Vérif présence S et E ---
  let hasStart = false;
  let hasExit = false;
  if (Array.isArray(grid)) {
    grid.forEach((rowStr) => {
      if (typeof rowStr === "string") {
        if (rowStr.includes("S")) hasStart = true;
        if (rowStr.includes("E")) hasExit = true;
      }
    });
  }
  if (!hasStart) errors.push("Aucun point de départ 'S' trouvé dans la grille.");
  if (!hasExit) errors.push("Aucune sortie 'E' trouvée dans la grille.");

  // --- Vérif steps ---
  if (!Array.isArray(steps) || steps.length === 0) {
    errors.push("Le champ 'steps' doit être un tableau non vide.");
  } else if (meta && grid) {
    const rows = meta.rows;
    const cols = meta.cols;
    const allowWallCollision = !!meta.allowWallCollision;

    // Build positions from moves or existing player coords
    let current = null;
    // find start
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === "S") current = { row: r, col: c };
      }
    }
    if (!current) {
      errors.push("Aucun point de départ 'S' trouvé dans la grille.");
      return { ok: false, errors };
    }

    const positions = [];
    steps.forEach((step, i) => {
      if (step.player && typeof step.player.row === "number" && typeof step.player.col === "number") {
        current = { row: step.player.row, col: step.player.col };
      } else if (step.move) {
        const mv = step.move.toUpperCase();
        if (mv === "UP") current = { row: current.row - 1, col: current.col };
        else if (mv === "DOWN") current = { row: current.row + 1, col: current.col };
        else if (mv === "LEFT") current = { row: current.row, col: current.col - 1 };
        else if (mv === "RIGHT") current = { row: current.row, col: current.col + 1 };
        else if (mv === "START") current = { ...current };
        else {
          errors.push(`Step ${i} : move '${step.move}' inconnu.`);
        }
      } else {
        errors.push(`Step ${i} : move ou player manquant.`);
      }
      positions.push({ index: i, ...current });
    });

    positions.forEach(({ index, row, col }) => {
      if (typeof row !== "number" || typeof col !== "number") {
        errors.push(`Step ${index} : 'row' et 'col' doivent être des nombres.`);
        return;
      }
      if (row < 0 || row >= rows || col < 0 || col >= cols) {
        errors.push(
          `Step ${index} : position (${row}, ${col}) hors de la grille (${rows}x${cols}).`
        );
        return;
      }
      const cell = grid[row][col];
      if (cell === "#" && !allowWallCollision) {
        errors.push(
          `Step ${index} : le joueur passe à travers un mur (#) en (${row}, ${col}).`
        );
      }
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

// Expose la fonction au global pour main.js
window.validateLabyrinthSimulation = validateLabyrinthSimulation;
