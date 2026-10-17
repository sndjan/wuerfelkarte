import { flip7Rules } from "./gamemodes";
import {
  Flip7Game,
  Flip7GamemodeKey,
  Flip7Player,
  Flip7Round,
  Flip7RoundEntry,
} from "./types";

/** Extra points for laying out seven different number cards. */
export const FLIP7_BONUS = 15;

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 18;

export const DEFAULT_TARGET_SCORE = 200;
export const TARGET_SCORE_STEP = 25;
export const MIN_TARGET_SCORE = 50;
export const MAX_TARGET_SCORE = 500;

/**
 * Highest reachable round: all seven number cards doubled, plus every plus
 * bonus and the Flip 7. Used to keep typos out of the keypad.
 */
export const MAX_ROUND_POINTS = 999;

export const emptyEntry = (): Flip7RoundEntry => ({
  points: null,
  busted: false,
  flip7: false,
});

/** Entry for a round that was already over when the player joined. */
export const absentEntry = (): Flip7RoundEntry => ({
  points: null,
  busted: false,
  flip7: false,
  absent: true,
});

export const createRound = (players: Flip7Player[]): Flip7Round => ({
  entries: Object.fromEntries(players.map((p) => [p.id, emptyEntry()])),
});

export const createFlip7Game = (
  players: Flip7Player[],
  targetScore: number,
  gamemode: Flip7GamemodeKey,
): Flip7Game => ({
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

const entryOf = (
  round: Flip7Round | undefined,
  playerId: string,
): Flip7RoundEntry | undefined => round?.entries[playerId];

/** A busted player is done; an absent one never played. Both need no number. */
export const isEntryComplete = (entry: Flip7RoundEntry | undefined): boolean =>
  entry != null && (entry.absent === true || entry.busted || entry.points != null);

/**
 * What the entry itself is worth — the Flip-7-Malus another player may have
 * aimed at this one is added by `playerRoundScore`, which can see the table.
 *
 * `null` while the entry is still open — distinct from a scored 0.
 */
export const entryScore = (
  entry: Flip7RoundEntry | undefined,
  gamemode: Flip7GamemodeKey,
): number | null => {
  if (!entry || entry.absent) return null;
  if (entry.busted) {
    // Mega-Fies allows Maluskarten against someone who already verzockt hat,
    // so their round ends on the malus; everywhere else a bust is a hard 0.
    return flip7Rules(gamemode).allowsNegative
      ? Math.min(entry.points ?? 0, 0)
      : 0;
  }
  if (entry.points == null) return null;
  // A Flip 7 that was cashed in against someone else pays its owner nothing.
  const keepsBonus = entry.flip7 && entry.flip7PenaltyOn == null;
  return entry.points + (keepsBonus ? FLIP7_BONUS : 0);
};

/** –15 for whoever a Flip 7 was traded against this round (Mega-Fies only). */
const flip7Penalty = (
  round: Flip7Round | undefined,
  playerId: string,
  gamemode: Flip7GamemodeKey,
): number =>
  flip7Rules(gamemode).allowsFlip7Penalty &&
  isFlip7Penalised(round, playerId)
    ? -FLIP7_BONUS
    : 0;

/** Whether someone traded their Flip 7 against this player in this round. */
export const isFlip7Penalised = (
  round: Flip7Round | undefined,
  playerId: string,
): boolean =>
  Object.values(round?.entries ?? {}).some(
    (entry) => entry.flip7 && entry.flip7PenaltyOn === playerId,
  );

/**
 * What a keypad answer means for the stored entry.
 *
 * Where a bust is worth exactly 0, a typed 0 is just a longer way of writing
 * the same result, so it is recorded as "Verzockt" instead. Mega-Fies tells the
 * two apart — Maluskarten still hit a busted player there — so the bust flag
 * survives a typed score and 0 stays a plain 0.
 */
export const entryPatchFromPoints = (
  points: number | null,
  flip7: boolean,
  gamemode: Flip7GamemodeKey,
  options: { flip7PenaltyOn?: string | null; busted?: boolean } = {},
): Partial<Flip7RoundEntry> => {
  const { flip7PenaltyOn = null, busted = false } = options;
  const rules = flip7Rules(gamemode);

  if (points === 0 && !rules.allowsNegative) {
    return { points: null, busted: true, flip7: false, flip7PenaltyOn: null };
  }

  const keepsBust = busted && rules.allowsNegative;
  return {
    points,
    busted: keepsBust,
    // A bust has no Flip 7 to keep or to give away.
    flip7: keepsBust ? false : flip7,
    flip7PenaltyOn:
      keepsBust || !flip7 || !rules.allowsFlip7Penalty ? null : flip7PenaltyOn,
  };
};

export const playerRoundScore = (
  round: Flip7Round | undefined,
  playerId: string,
  gamemode: Flip7GamemodeKey,
): number | null => {
  const score = entryScore(entryOf(round, playerId), gamemode);
  return score == null ? null : score + flip7Penalty(round, playerId, gamemode);
};

export const isRoundComplete = (
  round: Flip7Round | undefined,
  players: Flip7Player[],
): boolean =>
  round != null &&
  players.length > 0 &&
  players.every((p) => isEntryComplete(round.entries[p.id]));

export const hasAnyEntry = (round: Flip7Round | undefined): boolean =>
  round != null &&
  Object.values(round.entries).some(
    (entry) => !entry.absent && (entry.points != null || entry.busted || entry.flip7),
  );

/** Sum of everything scored in a round — the "so viel ging diese Runde raus". */
export const roundTotal = (
  round: Flip7Round | undefined,
  players: Flip7Player[],
  gamemode: Flip7GamemodeKey,
): number =>
  players.reduce(
    (sum, p) => sum + (playerRoundScore(round, p.id, gamemode) ?? 0),
    0,
  );

export const totalScore = (game: Flip7Game, playerId: string): number =>
  game.rounds.reduce(
    (sum, round) => sum + (playerRoundScore(round, playerId, game.gamemode) ?? 0),
    0,
  );

export const scoreAfterRound = (
  game: Flip7Game,
  playerId: string,
  roundIndex: number,
): number =>
  game.rounds
    .slice(0, roundIndex + 1)
    .reduce(
      (sum, round) => sum + (playerRoundScore(round, playerId, game.gamemode) ?? 0),
      0,
    );

export const roundsPlayedBy = (game: Flip7Game, playerId: string): number =>
  game.rounds.filter((round) => {
    const entry = round.entries[playerId];
    return entry != null && !entry.absent && (entry.busted || entry.points != null);
  }).length;

export const flip7Count = (game: Flip7Game, playerId: string): number =>
  game.rounds.filter((round) => round.entries[playerId]?.flip7 === true).length;

export const bustCount = (game: Flip7Game, playerId: string): number =>
  game.rounds.filter((round) => round.entries[playerId]?.busted === true).length;

export const bestRoundScore = (game: Flip7Game, playerId: string): number =>
  game.rounds.reduce(
    (best, round) =>
      Math.max(best, playerRoundScore(round, playerId, game.gamemode) ?? 0),
    0,
  );

/** Standings, highest first — ties keep their current seating order. */
export const standings = (game: Flip7Game) =>
  game.players
    .map((player) => ({
      ...player,
      score: totalScore(game, player.id),
    }))
    .sort((a, b) => b.score - a.score);

export const leaderScore = (game: Flip7Game): number =>
  game.players.reduce((best, p) => Math.max(best, totalScore(game, p.id)), 0);

export const targetReached = (game: Flip7Game): boolean =>
  game.players.length > 0 && leaderScore(game) >= game.targetScore;

/**
 * Smallest goal that isn't already behind the leader — a lower one would end
 * the partie the moment it is saved. Snapped up to the stepper's grid.
 */
export const minTargetScore = (game: Flip7Game): number =>
  Math.max(
    MIN_TARGET_SCORE,
    Math.ceil(leaderScore(game) / TARGET_SCORE_STEP) * TARGET_SCORE_STEP,
  );

/**
 * "Es kann nur eine Person gewinnen" — a shared lead at the target means the
 * rulebook wants another round, so the end-of-game prompt says so.
 */
export const isTiedAtTop = (game: Flip7Game): boolean => {
  const best = leaderScore(game);
  return game.players.filter((p) => totalScore(game, p.id) === best).length > 1;
};

export const isGameFinished = (game: Flip7Game): boolean =>
  game.finishedAt != null;

/** First round still missing entries, or the last one when everything is filled. */
export const firstOpenRound = (game: Flip7Game): number => {
  const index = game.rounds.findIndex(
    (round) => !isRoundComplete(round, game.players),
  );
  return index === -1 ? Math.max(0, game.rounds.length - 1) : index;
};

/**
 * Lowest round count the game may shrink to: rounds that already hold entries
 * stay, so nothing typed in is ever silently dropped.
 */
export const minAllowedRounds = (game: Flip7Game): number => {
  let last = 0;
  game.rounds.forEach((round, index) => {
    if (hasAnyEntry(round)) last = index + 1;
  });
  return Math.max(1, last);
};
