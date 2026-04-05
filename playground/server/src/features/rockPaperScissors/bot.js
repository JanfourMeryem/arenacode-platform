'use strict';

const { DEFAULT_ROCK_PAPER_SCISSORS_GENERATION_CONFIG } = require('./constants');

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomBotMoves(rounds) {
  const moves = [];
  for (let round = 0; round < rounds; round += 1) {
    moves.push(randomInteger(1, 3));
  }
  return moves;
}

function generateRandomRockPaperScissorsConfig() {
  const settings = DEFAULT_ROCK_PAPER_SCISSORS_GENERATION_CONFIG;
  const rounds = randomInteger(settings.minRounds, settings.maxRounds);

  return {
    rounds,
    tickDurationMs: settings.tickDurationMs,
    botMoves: generateRandomBotMoves(rounds),
  };
}

module.exports = {
  generateRandomRockPaperScissorsConfig,
};
