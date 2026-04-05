'use strict';

const { ROCK_PAPER_SCISSORS_MOVE_CODE_TO_NAME } = require('./constants');

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

function simulateRockPaperScissorsMatch(config, userMoves) {
  const rounds = [];
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (let roundIndex = 0; roundIndex < config.rounds; roundIndex += 1) {
    const round = roundIndex + 1;
    const userMoveCode = userMoves[roundIndex];
    const botMoveCode = config.botMoves[roundIndex];
    const outcome = resolveRoundOutcome(userMoveCode, botMoveCode);

    if (outcome === 'win') wins += 1;
    if (outcome === 'loss') losses += 1;
    if (outcome === 'draw') draws += 1;

    rounds.push({
      t: roundIndex,
      round,
      userMoveCode,
      userMove: ROCK_PAPER_SCISSORS_MOVE_CODE_TO_NAME[userMoveCode],
      botMoveCode,
      botMove: ROCK_PAPER_SCISSORS_MOVE_CODE_TO_NAME[botMoveCode],
      outcome,
    });
  }

  let status = 'draw';
  let reason = `Draw match: ${wins} win(s), ${losses} loss(es), ${draws} draw(s).`;

  if (wins > losses) {
    status = 'success';
    reason = `You win the match: ${wins} win(s), ${losses} loss(es), ${draws} draw(s).`;
  } else if (losses > wins) {
    status = 'defeat';
    reason = `Bot wins the match: ${wins} win(s), ${losses} loss(es), ${draws} draw(s).`;
  }

  return {
    status,
    reason,
    parsedMoves: userMoves.length,
    executedMoves: rounds.length,
    wins,
    losses,
    draws,
    rounds,
  };
}

module.exports = {
  simulateRockPaperScissorsMatch,
};
