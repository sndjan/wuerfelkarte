import {
  CaboGame,
  CaboGamemodeKey,
  CaboPlayer,
  CaboRound,
  CaboRoundEntry,
} from "./types";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export const DEFAULT_TARGET_SCORE = 100;
export const TARGET_SCORE_STEP = 10;
export const MIN_TARGET_SCORE = 20;
export const MAX_TARGET_SCORE = 300;

/** Sum of the special hand's four cards (12+12+13+13) — the highest a hand can add up to. */
export const SPECIAL_HAND_SUM = 50;
/** What everyone but the special-hand holder is charged instead of their own sum. */
export const SPECIAL_HAND_PENALTY = 50;
/** Added to the Cabo-Sager's own sum when someone else had the lowest hand. */
export const CABO_MISS_PENALTY = 5;

/** Highest sum a hand of cards could plausibly add up to. Keeps typos out of the keypad. */
export const MAX_CARD_SUM = 199;

export const emptyEntry = (): CaboRoundEntry => ({
  cardSum: null,
  calledCabo: false,
  specialHand: false,
});

/** Entry for a round that was already over when the player joined. */
export const absentEntry = (): CaboRoundEntry => ({
  cardSum: null,
  calledCabo: false,
  specialHand: false,
  absent: true,
});

export const createRound = (players: CaboPlayer[]): CaboRound => ({
  entries: Object.fromEntries(players.map((p) => [p.id, emptyEntry()])),
});

export const createCaboGame = (
  players: CaboPlayer[],
  targetScore: number,
  gamemode: CaboGamemodeKey,
): CaboGame => ({
  id: crypto.randomUUID(),
  gamemode,
  targetScore,
  players,
  rounds: [createRound(players)],
  startedAt: null,
  finishedAt: null,
});

export const clampTargetScore = (value: number): number =>
  Math.min(
    MAX_TARGET_SCORE,
    Math.max(MIN_TARGET_SCORE, Math.round(value / TARGET_SCORE_STEP) * TARGET_SCORE_STEP),
  );

/**
 * A resolved entry has a sum, declares the special hand (its own sum doesn't
 * matter once that trumps the round), or the player simply wasn't there.
 */
export const isEntryComplete = (entry: CaboRoundEntry | undefined): boolean =>
  entry != null &&
  (entry.absent === true || entry.specialHand === true || entry.cardSum != null);

export const isRoundComplete = (
  round: CaboRound | undefined,
  players: CaboPlayer[],
): boolean =>
  round != null &&
  players.length > 0 &&
  players.every((p) => isEntryComplete(round.entries[p.id]));

export const hasAnyEntry = (round: CaboRound | undefined): boolean =>
  round != null &&
  Object.values(round.entries).some(
    (entry) =>
      !entry.absent &&
      (entry.cardSum != null || entry.calledCabo || entry.specialHand),
  );

/**
 * Works out every active player's points for one round — the whole scoring
 * sheet at once, because who won depends on everybody's hand, not just one
 * player's own entry. `null` per player while the round is still open.
 */
export const computeRoundScores = (
  round: CaboRound | undefined,
  players: CaboPlayer[],
): Record<string, number | null> => {
  const result: Record<string, number | null> = {};
  if (!round) {
    players.forEach((p) => (result[p.id] = null));
    return result;
  }

  const active = players.filter((p) => round.entries[p.id]?.absent !== true);
  players
    .filter((p) => round.entries[p.id]?.absent === true)
    .forEach((p) => (result[p.id] = null));

  if (active.length === 0) return result;

  const complete = active.every((p) => isEntryComplete(round.entries[p.id]));
  if (!complete) {
    active.forEach((p) => (result[p.id] = null));
    return result;
  }

  // Zeigt eigene Auslage 12-12-13-13: trumps the normal scoring entirely.
  const specialHolder = active.find((p) => round.entries[p.id]?.specialHand);
  if (specialHolder) {
    active.forEach((p) => {
      result[p.id] = p.id === specialHolder.id ? 0 : SPECIAL_HAND_PENALTY;
    });
    return result;
  }

  const sumOf = (p: CaboPlayer) => round.entries[p.id]!.cardSum as number;
  const minSum = Math.min(...active.map(sumOf));
  const tied = active.filter((p) => sumOf(p) === minSum);
  const caboCaller = active.find((p) => round.entries[p.id]?.calledCabo);
  const callerTied = caboCaller != null && tied.some((p) => p.id === caboCaller.id);

  active.forEach((p) => {
    const isTiedForLowest = tied.some((t) => t.id === p.id);
    const isCaller = caboCaller != null && p.id === caboCaller.id;

    if (tied.length > 1) {
      // Patt bei kleinster Summe: Cabo-Sager gewinnt, sonst gewinnt niemand.
      if (callerTied) {
        result[p.id] = isCaller ? 0 : sumOf(p);
      } else {
        result[p.id] = isTiedForLowest ? 0 : isCaller ? sumOf(p) + CABO_MISS_PENALTY : sumOf(p);
      }
      return;
    }

    // A single lowest hand always wins, Cabo-Sager or not.
    if (isTiedForLowest) {
      result[p.id] = 0;
    } else {
      result[p.id] = isCaller ? sumOf(p) + CABO_MISS_PENALTY : sumOf(p);
    }
  });

  return result;
};

export const playerRoundScore = (
  round: CaboRound | undefined,
  players: CaboPlayer[],
  playerId: string,
): number | null => computeRoundScores(round, players)[playerId] ?? null;

/** Sum of everything scored in a round — the "so viel ging diese Runde raus". */
export const roundTotal = (
  round: CaboRound | undefined,
  players: CaboPlayer[],
): number => {
  const scores = computeRoundScores(round, players);
  return players.reduce((sum, p) => sum + (scores[p.id] ?? 0), 0);
};

/**
 * Running total through a slice of the game's rounds, applying the "genau
 * Zielpunktzahl erreicht" reduction after the round that lands on it exactly.
 */
const scoreThroughRounds = (
  rounds: CaboRound[],
  players: CaboPlayer[],
  playerId: string,
  targetScore: number,
): number => {
  let total = 0;
  for (const round of rounds) {
    const roundScore = computeRoundScores(round, players)[playerId];
    if (roundScore == null) continue;
    total += roundScore;
    if (total === targetScore) total -= targetScore / 2;
  }
  return total;
};

export const totalScore = (game: CaboGame, playerId: string): number =>
  scoreThroughRounds(game.rounds, game.players, playerId, game.targetScore);

export const scoreAfterRound = (
  game: CaboGame,
  playerId: string,
  roundIndex: number,
): number =>
  scoreThroughRounds(
    game.rounds.slice(0, roundIndex + 1),
    game.players,
    playerId,
    game.targetScore,
  );

export const roundsPlayedBy = (game: CaboGame, playerId: string): number =>
  game.rounds.filter((round) => {
    const entry = round.entries[playerId];
    return entry != null && !entry.absent && entry.cardSum != null;
  }).length;

export const roundsWonBy = (game: CaboGame, playerId: string): number =>
  game.rounds.filter((round) => {
    if (round.entries[playerId]?.absent) return false;
    return computeRoundScores(round, game.players)[playerId] === 0;
  }).length;

export const caboCallCount = (game: CaboGame, playerId: string): number =>
  game.rounds.filter((round) => round.entries[playerId]?.calledCabo === true).length;

/** Standings, lowest first — ties keep their current seating order. */
export const standings = (game: CaboGame) =>
  game.players
    .map((player) => ({
      ...player,
      score: totalScore(game, player.id),
    }))
    .sort((a, b) => a.score - b.score);

/** The highest total on the table — whoever is closest to ending the game. */
export const highestScore = (game: CaboGame): number =>
  game.players.reduce((worst, p) => Math.max(worst, totalScore(game, p.id)), 0);

export const targetReached = (game: CaboGame): boolean =>
  game.players.length > 0 && highestScore(game) > game.targetScore;

/**
 * Smallest goal that isn't already behind the current worst total — a lower
 * one would end the partie retroactively. Snapped up to the stepper's grid.
 */
export const minTargetScore = (game: CaboGame): number =>
  Math.max(
    MIN_TARGET_SCORE,
    Math.ceil(highestScore(game) / TARGET_SCORE_STEP) * TARGET_SCORE_STEP,
  );

export const isGameFinished = (game: CaboGame): boolean => game.finishedAt != null;

/** First round still missing entries, or the last one when everything is filled. */
export const firstOpenRound = (game: CaboGame): number => {
  const index = game.rounds.findIndex((round) => !isRoundComplete(round, game.players));
  return index === -1 ? Math.max(0, game.rounds.length - 1) : index;
};

/**
 * Lowest round count the game may shrink to: rounds that already hold entries
 * stay, so nothing typed in is ever silently dropped.
 */
export const minAllowedRounds = (game: CaboGame): number => {
  let last = 0;
  game.rounds.forEach((round, index) => {
    if (hasAnyEntry(round)) last = index + 1;
  });
  return Math.max(1, last);
};
