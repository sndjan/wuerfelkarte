import {
  Dart,
  DartsGame,
  DartsGamemodeKey,
  DartsInRule,
  DartsLeg,
  DartsOutRule,
  DartsPlayer,
  DartsTurn,
} from "./types";

/** A dart that scored nothing — the wire, the wall, the floor. */
export const MISS_SEGMENT = 0;
/** Both bull rings live on one segment: ×1 is the 25, ×2 the inner 50. */
export const BULL_SEGMENT = 25;

/** The twenty numbered beds, in plain ascending order (the keypad's layout). */
export const NUMBER_SEGMENTS = Array.from({ length: 20 }, (_, i) => i + 1);

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 8;

export const DARTS_PER_TURN = 3;
/** Three triple twenties — nothing scores higher in one visit. */
export const MAX_TURN_SCORE = 180;

export const START_SCORE_PRESETS = [301, 501, 701];
export const DEFAULT_START_SCORE = 501;
export const START_SCORE_STEP = 100;
export const MIN_START_SCORE = 101;
export const MAX_START_SCORE = 1001;

export const DEFAULT_LEGS_TO_WIN = 3;
export const MIN_LEGS_TO_WIN = 1;
export const MAX_LEGS_TO_WIN = 15;

export const DEFAULT_IN_RULE: DartsInRule = "straight";
export const DEFAULT_OUT_RULE: DartsOutRule = "double";

export const dart = (segment: number, multiplier: 1 | 2 | 3 = 1): Dart => ({
  segment,
  multiplier,
});

export const MISS: Dart = dart(MISS_SEGMENT, 1);
export const BULL: Dart = dart(BULL_SEGMENT, 1);
export const DOUBLE_BULL: Dart = dart(BULL_SEGMENT, 2);

export const dartValue = (d: Dart): number =>
  d.segment === MISS_SEGMENT ? 0 : d.segment * d.multiplier;

/** The bull has no triple ring, and a miss has no ring at all. */
export const isDartPossible = (d: Dart): boolean => {
  if (d.segment === MISS_SEGMENT) return d.multiplier === 1;
  if (d.segment === BULL_SEGMENT) return d.multiplier === 1 || d.multiplier === 2;
  return d.segment >= 1 && d.segment <= 20;
};

/** The inner bull is the board's 25-double, so it opens and finishes like one. */
export const isDoubleDart = (d: Dart): boolean =>
  d.segment !== MISS_SEGMENT && d.multiplier === 2;

export const isTripleDart = (d: Dart): boolean =>
  d.segment !== MISS_SEGMENT && d.multiplier === 3;

/** Scoreboard shorthand: T20, D16, 25, Bull, 7. */
export const dartLabel = (d: Dart): string => {
  if (d.segment === MISS_SEGMENT) return "Miss";
  if (d.segment === BULL_SEGMENT) return d.multiplier === 2 ? "Bull" : "25";
  if (d.multiplier === 2) return `D${d.segment}`;
  if (d.multiplier === 3) return `T${d.segment}`;
  return String(d.segment);
};

/** Spoken form for buttons and board segments, where "T20" reads badly. */
export const dartAriaLabel = (d: Dart): string => {
  if (d.segment === MISS_SEGMENT) return "Miss, 0 Punkte";
  if (d.segment === BULL_SEGMENT) {
    return d.multiplier === 2 ? "Bullseye, 50 Punkte" : "Single Bull, 25 Punkte";
  }
  const ring =
    d.multiplier === 3 ? "Triple" : d.multiplier === 2 ? "Double" : "Single";
  return `${ring} ${d.segment}, ${dartValue(d)} Punkte`;
};

export const satisfiesIn = (d: Dart, rule: DartsInRule): boolean => {
  if (dartValue(d) === 0) return false;
  if (rule === "straight") return true;
  if (rule === "double") return isDoubleDart(d);
  return isDoubleDart(d) || isTripleDart(d);
};

export const satisfiesOut = (d: Dart, rule: DartsOutRule): boolean => {
  if (rule === "straight") return true;
  if (rule === "double") return isDoubleDart(d);
  return isDoubleDart(d) || isTripleDart(d);
};

export type DartsRules = {
  startScore: number;
  inRule: DartsInRule;
  outRule: DartsOutRule;
};

export const rulesOf = (game: DartsGame): DartsRules => ({
  startScore: game.startScore,
  inRule: game.inRule,
  outRule: game.outRule,
});

/** What one visit did to a player's leg. */
export type TurnResult = {
  playerId: string;
  darts: Dart[];
  /** Remaining before the first dart of the visit. */
  before: number;
  /** Remaining after it — equal to `before` when the visit busted. */
  after: number;
  /** Points that counted; 0 for a bust. */
  score: number;
  /** Went below zero, left exactly 1, or finished on the wrong ring. */
  busted: boolean;
  checkout: boolean;
  /** Opened their account during this visit (only interesting for Double-In). */
  openedHere: boolean;
  /** No further dart may be thrown in this visit. */
  complete: boolean;
};

/**
 * Replays one visit against a player's standing score.
 *
 * A bust rewinds everything the visit did, the opening dart included: its
 * points are taken back, so with Double-In the player still has to open.
 */
export function playTurn(
  playerId: string,
  darts: Dart[],
  before: number,
  opened: boolean,
  rules: DartsRules,
): TurnResult {
  let remaining = before;
  let isOpen = opened;
  let busted = false;
  let checkout = false;

  for (const d of darts) {
    if (!isOpen) {
      // Until the opening ring is hit, darts are thrown for nothing.
      if (!satisfiesIn(d, rules.inRule)) continue;
      isOpen = true;
    }

    const next = remaining - dartValue(d);
    if (next < 0) {
      busted = true;
      break;
    }
    if (next === 0) {
      if (satisfiesOut(d, rules.outRule)) {
        remaining = 0;
        checkout = true;
      } else {
        busted = true;
      }
      break;
    }
    // Nothing can be checked out from 1 unless a single finish is allowed.
    if (next === 1 && rules.outRule !== "straight") {
      busted = true;
      break;
    }
    remaining = next;
  }

  const after = busted ? before : remaining;
  return {
    playerId,
    darts,
    before,
    after,
    score: before - after,
    busted,
    checkout,
    openedHere: !busted && !opened && isOpen,
    complete: busted || checkout || darts.length >= DARTS_PER_TURN,
  };
}

export type LegState = {
  /** Every visit of the leg, in the order it was thrown. */
  turns: TurnResult[];
  remaining: Record<string, number>;
  opened: Record<string, boolean>;
  dartsThrown: Record<string, number>;
  pointsScored: Record<string, number>;
  /** Who checked out, or `null` while the leg is still running. */
  winnerId: string | null;
  /** Darts the winner needed — what "best leg" is measured in. */
  winnerDarts: number;
  /** The visit still accepting darts, or `null` when the next dart starts a new one. */
  openTurnIndex: number | null;
  /** Who throws the next dart; `null` once the leg is decided. */
  currentPlayerId: string | null;
  dartsLeftInTurn: number;
};

const nextPlayerId = (players: DartsPlayer[], afterId: string): string => {
  const index = players.findIndex((p) => p.id === afterId);
  // A player removed mid-leg leaves no position to continue from, so the
  // rotation restarts at the top rather than stalling.
  return players[index === -1 ? 0 : (index + 1) % players.length].id;
};

export const legStarterId = (
  players: DartsPlayer[],
  leg: DartsLeg,
): string | null =>
  players.length === 0
    ? null
    : players[((leg.startIndex % players.length) + players.length) % players.length]
        .id;

/** Everything about a leg that the board shows, derived from its darts alone. */
export function legState(
  players: DartsPlayer[],
  leg: DartsLeg,
  rules: DartsRules,
): LegState {
  const remaining: Record<string, number> = {};
  const opened: Record<string, boolean> = {};
  const dartsThrown: Record<string, number> = {};
  const pointsScored: Record<string, number> = {};

  for (const player of players) {
    remaining[player.id] = rules.startScore;
    opened[player.id] = rules.inRule === "straight";
    dartsThrown[player.id] = 0;
    pointsScored[player.id] = 0;
  }

  const turns: TurnResult[] = [];
  let winnerId: string | null = null;
  let winnerDarts = 0;

  for (const turn of leg.turns) {
    if (winnerId) break;
    const before = remaining[turn.playerId] ?? rules.startScore;
    const result = playTurn(
      turn.playerId,
      turn.darts,
      before,
      opened[turn.playerId] ?? rules.inRule === "straight",
      rules,
    );
    turns.push(result);
    remaining[turn.playerId] = result.after;
    // A bust rewinds the visit, so an opening dart inside it is rewound too.
    if (!result.busted && result.openedHere) opened[turn.playerId] = true;
    dartsThrown[turn.playerId] =
      (dartsThrown[turn.playerId] ?? 0) + turn.darts.length;
    pointsScored[turn.playerId] =
      (pointsScored[turn.playerId] ?? 0) + result.score;
    if (result.checkout) {
      winnerId = turn.playerId;
      winnerDarts = dartsThrown[turn.playerId];
    }
  }

  const lastTurn = turns[turns.length - 1];
  const openTurnIndex =
    !winnerId && lastTurn && !lastTurn.complete ? turns.length - 1 : null;

  let currentPlayerId: string | null = null;
  if (!winnerId && players.length > 0) {
    if (openTurnIndex !== null) currentPlayerId = lastTurn.playerId;
    else if (lastTurn) currentPlayerId = nextPlayerId(players, lastTurn.playerId);
    else currentPlayerId = legStarterId(players, leg);
  }

  return {
    turns,
    remaining,
    opened,
    dartsThrown,
    pointsScored,
    winnerId,
    winnerDarts,
    openTurnIndex,
    currentPlayerId,
    dartsLeftInTurn:
      openTurnIndex === null
        ? DARTS_PER_TURN
        : DARTS_PER_TURN - lastTurn.darts.length,
  };
}

export const createLeg = (legIndex: number, playerCount: number): DartsLeg => ({
  // The starter rotates leg by leg, which stands in for throwing for bull.
  startIndex: playerCount > 0 ? legIndex % playerCount : 0,
  turns: [],
});

export const createDartsGame = (
  players: DartsPlayer[],
  settings: {
    startScore: number;
    inRule: DartsInRule;
    outRule: DartsOutRule;
    legsToWin: number;
  },
  gamemode: DartsGamemodeKey,
): DartsGame => ({
  id: crypto.randomUUID(),
  gamemode,
  startScore: clampStartScore(settings.startScore),
  inRule: settings.inRule,
  outRule: settings.outRule,
  legsToWin: clampLegsToWin(settings.legsToWin),
  players,
  legs: [createLeg(0, players.length)],
  startedAt: null,
  finishedAt: null,
});

/** Snapped onto the x01 grid, so a custom start score still ends in 01. */
export const clampStartScore = (value: number): number => {
  const snapped =
    Math.round((value - 1) / START_SCORE_STEP) * START_SCORE_STEP + 1;
  return Math.min(MAX_START_SCORE, Math.max(MIN_START_SCORE, snapped));
};

export const clampLegsToWin = (value: number): number =>
  Math.min(MAX_LEGS_TO_WIN, Math.max(MIN_LEGS_TO_WIN, Math.round(value)));

export const currentLeg = (game: DartsGame): DartsLeg =>
  game.legs[game.legs.length - 1] ?? createLeg(0, game.players.length);

export const currentLegIndex = (game: DartsGame): number =>
  Math.max(0, game.legs.length - 1);

export const legStateAt = (game: DartsGame, legIndex: number): LegState =>
  legState(
    game.players,
    game.legs[legIndex] ?? createLeg(legIndex, game.players.length),
    rulesOf(game),
  );

export const currentLegState = (game: DartsGame): LegState =>
  legStateAt(game, currentLegIndex(game));

export const legsWon = (game: DartsGame, playerId: string): number =>
  game.legs.filter(
    (_, index) => legStateAt(game, index).winnerId === playerId,
  ).length;

/** Whoever has taken the agreed number of legs, or `null` while it is open. */
export const matchWinnerId = (game: DartsGame): string | null =>
  game.players.find((p) => legsWon(game, p.id) >= game.legsToWin)?.id ?? null;

export const isMatchDecided = (game: DartsGame): boolean =>
  matchWinnerId(game) !== null;

/** Any dart thrown at all — what the clock and "nothing to undo" key off. */
export const hasAnyDart = (game: DartsGame): boolean =>
  game.legs.some((leg) => leg.turns.some((turn) => turn.darts.length > 0));

export type PlayerStats = {
  legsWon: number;
  dartsThrown: number;
  pointsScored: number;
  /** Points per three darts; 0 before the first dart. */
  average: number;
  bestTurn: number;
  maximums: number;
  turns140: number;
  turns100: number;
  /** Fewest darts in a leg this player won; 0 when they won none. */
  bestLegDarts: number;
};

const emptyStats: PlayerStats = {
  legsWon: 0,
  dartsThrown: 0,
  pointsScored: 0,
  average: 0,
  bestTurn: 0,
  maximums: 0,
  turns140: 0,
  turns100: 0,
  bestLegDarts: 0,
};

/**
 * One player's numbers over the whole match.
 *
 * Busted visits count their darts but no points — exactly how a three-dart
 * average is reckoned on a real scoreboard.
 */
export function playerStats(game: DartsGame, playerId: string): PlayerStats {
  const stats: PlayerStats = { ...emptyStats };

  game.legs.forEach((_, legIndex) => {
    const state = legStateAt(game, legIndex);
    stats.dartsThrown += state.dartsThrown[playerId] ?? 0;
    stats.pointsScored += state.pointsScored[playerId] ?? 0;

    for (const turn of state.turns) {
      if (turn.playerId !== playerId) continue;
      stats.bestTurn = Math.max(stats.bestTurn, turn.score);
      if (turn.score === MAX_TURN_SCORE) stats.maximums += 1;
      else if (turn.score >= 140) stats.turns140 += 1;
      else if (turn.score >= 100) stats.turns100 += 1;
    }

    if (state.winnerId === playerId) {
      stats.legsWon += 1;
      stats.bestLegDarts =
        stats.bestLegDarts === 0
          ? state.winnerDarts
          : Math.min(stats.bestLegDarts, state.winnerDarts);
    }
  });

  stats.average =
    stats.dartsThrown > 0
      ? (stats.pointsScored / stats.dartsThrown) * DARTS_PER_TURN
      : 0;
  return stats;
}

/** Standings for the scorecard: legs won, most first. */
export const standings = (game: DartsGame) =>
  game.players
    .map((player) => ({ ...player, score: legsWon(game, player.id) }))
    .sort((a, b) => b.score - a.score);

/** Nobody can win the match any more by playing on — used for the reset guard. */
export const legsPlayed = (game: DartsGame): number =>
  game.legs.filter((_, index) => legStateAt(game, index).winnerId !== null)
    .length;

/**
 * Lowest leg target that wouldn't end a running match retroactively: at least
 * what the leading player has already won.
 */
export const minLegsToWin = (game: DartsGame): number =>
  Math.max(
    MIN_LEGS_TO_WIN,
    game.players.reduce((best, p) => Math.max(best, legsWon(game, p.id)), 0),
  );

/** Drops the last dart thrown anywhere in the game; `null` when there is none. */
export function withoutLastDart(game: DartsGame): DartsGame | null {
  for (let legIndex = game.legs.length - 1; legIndex >= 0; legIndex -= 1) {
    const leg = game.legs[legIndex];
    for (let turnIndex = leg.turns.length - 1; turnIndex >= 0; turnIndex -= 1) {
      const turn = leg.turns[turnIndex];
      if (turn.darts.length === 0) continue;

      const shortened: DartsTurn = {
        ...turn,
        darts: turn.darts.slice(0, -1),
      };
      // An emptied visit goes away with its dart, so the previous player keeps
      // the oche instead of being skipped on the way back.
      const turns =
        shortened.darts.length > 0
          ? [...leg.turns.slice(0, turnIndex), shortened]
          : leg.turns.slice(0, turnIndex);

      const legs = [
        ...game.legs.slice(0, legIndex),
        { ...leg, turns },
        // Legs after this one can only exist because the leg was won, which
        // the removed dart just undid.
      ];
      return { ...game, legs, finishedAt: null };
    }
  }
  return null;
}
