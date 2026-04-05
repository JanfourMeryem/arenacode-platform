/*
   AlgoArena — Runtime context detection
   Detects embed/challenge flags from URL query params.
*/

const CHALLENGE_SLUG_ALIASES = Object.freeze({
  'solo-snake': 'snake',
  'rock-paper-scissors': 'rock-paper-scissors',
  rockpaperscissors: 'rock-paper-scissors',
  rps: 'rock-paper-scissors',
  'course-tresor': 'treasure',
  'course-trésor': 'treasure',
  'course-tr%c3%a9sor': 'treasure',
  'treasure-run': 'treasure',
});

function _normalizeChallengeName(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return CHALLENGE_SLUG_ALIASES[normalized] || normalized;
}

function _inferChallengeFromReferrer() {
  try {
    if (window.self === window.top) return '';
  } catch {
    return '';
  }

  const ref = typeof document?.referrer === 'string' ? document.referrer : '';
  if (!ref) return '';

  try {
    const refUrl = new URL(ref, window.location.origin);
    const match = refUrl.pathname.match(/\/challenges\/games\/([^/]+)\/?/i);
    return match ? _normalizeChallengeName(match[1]) : '';
  } catch {
    return '';
  }
}

export function detectRuntimeContext(search = window.location.search) {
  const params = new URLSearchParams(search || '');
  const embed = (params.get('embed') || '').trim().toLowerCase();
  const challengeFromQuery = _normalizeChallengeName(params.get('challenge') || '');
  const challenge = challengeFromQuery || _inferChallengeFromReferrer();
  const theme = (params.get('theme') || '').trim().toLowerCase();
  const forcedTheme = theme === 'dark' || theme === 'light' ? theme : null;

  // Challenge mode must stay stable in iframe even if URL params are partially missing.
  const isEmbeddedChallenge = embed === 'challenge' || Boolean(challenge);
  const isSnakeChallenge = isEmbeddedChallenge && challenge === 'snake';
  const isRockPaperScissorsChallenge = isEmbeddedChallenge && challenge === 'rock-paper-scissors';
  const isLabyrinthChallenge = isEmbeddedChallenge && challenge === 'labyrinth';
  const isTreasureChallenge = isEmbeddedChallenge && challenge === 'treasure';

  return Object.freeze({
    embed,
    challenge,
    forcedTheme,
    isEmbeddedChallenge,
    isSnakeChallenge,
    isRockPaperScissorsChallenge,
    isLabyrinthChallenge,
    isTreasureChallenge,
  });
}
