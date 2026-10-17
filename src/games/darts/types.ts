/** Only X01 so far — the union keeps the door open for Cricket and Around the Clock. */
export type DartsGamemodeKey = "X01";

export type DartsPlayer = {
  id: string;
  name: string;
  emoji?: string;
};

/** How a player has to open their scoring: any dart, a double, or a double/triple. */
export type DartsInRule = "straight" | "double" | "master";
/** How a player has to finish: exactly zero, on a double, or on a double/triple. */
export type DartsOutRule = "straight" | "double" | "master";

/**
 * One thrown dart.
 *
 * `segment` is the bed it landed in: 1–20, `BULL_SEGMENT` for the bull, or
 * `MISS_SEGMENT` for everything that scored nothing. `multiplier` is the ring —
 * on the bull a 2 means the inner 50, and a miss is always a 1.
 */
export type Dart = {
  segment: number;
  multiplier: 1 | 2 | 3;
};

/**
 * One visit to the oche: up to three darts by one player.
 *
 * Nothing derived is stored — whether the turn busted, checked out or is still
 * open all follows from the darts plus the rules, which is what makes undoing a
 * single dart a matter of popping it off this list.
 */
export type DartsTurn = {
  playerId: string;
  darts: Dart[];
};

export type DartsLeg = {
  /** Index into `players` of whoever throws first — rotates leg by leg. */
  startIndex: number;
  turns: DartsTurn[];
};

export type DartsGame = {
  /** Identifies the match in the history, so re-finishing updates instead of duplicating. */
  id: string;
  gamemode: DartsGamemodeKey;
  /** 501 and friends — what everyone starts a leg on. */
  startScore: number;
  inRule: DartsInRule;
  outRule: DartsOutRule;
  /** Legs one player has to win to take the match. */
  legsToWin: number;
  players: DartsPlayer[];
  /** Grows one leg at a time; the last one is the leg being played. */
  legs: DartsLeg[];
  startedAt: number | null;
  /** Set when the match is decided; resuming clears it again. */
  finishedAt: number | null;
};

export type DartsMatchPlayer = {
  name: string;
  emoji?: string;
  /** Legs won — the result the history and the scorecard rank by. */
  score: number;
  dartsThrown: number;
  pointsScored: number;
  /** Points per three darts, the headline darts number. */
  average: number;
  /** Highest single visit. */
  bestTurn: number;
  /** Visits of exactly 180. */
  maximums: number;
  /** Visits of 140–179. */
  turns140: number;
  /** Visits of 100–139. */
  turns100: number;
  /** Fewest darts used in a leg this player won; 0 when they won none. */
  bestLegDarts: number;
};

export type StoredDartsMatch = {
  id: string;
  players: DartsMatchPlayer[];
  gamemode: DartsGamemodeKey;
  startScore: number;
  inRule: DartsInRule;
  outRule: DartsOutRule;
  legsToWin: number;
  /** Legs actually played out. */
  totalLegs: number;
  timestamp: string;
  durationMs?: number;
};
