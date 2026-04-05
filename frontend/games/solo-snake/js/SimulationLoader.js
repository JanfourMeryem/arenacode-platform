// ============================================
// SIMULATION LOADER
// Loads and normalizes replay data
// ============================================

export class SimulationLoader {
  async loadSimulation(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load simulation: ${response.statusText}`);
    }
    const data = await response.json();
    return this.normalize(data);
  }

  normalize(data) {
    if (!data.grid || !data.player || !data.moves || !data.result) {
      throw new Error('Invalid simulation format: missing required fields');
    }

    const directionMap = {
      'UP': { x: 0, y: -1 },
      'DOWN': { x: 0, y: 1 },
      'LEFT': { x: -1, y: 0 },
      'RIGHT': { x: 1, y: 0 }
    };

    data.player.startDir = directionMap[data.player.startDirection] || { x: 1, y: 0 };
    data.moves = data.moves.map(move => ({
      turn: move.turn,
      direction: directionMap[move.direction] || directionMap.RIGHT
    }));

    data.foods = data.foods || [];
    return data;
  }
}
