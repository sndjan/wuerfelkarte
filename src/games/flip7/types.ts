/** Only one mode so far — the union keeps the door open for variants. */
export type Flip7GamemodeKey = "Standard";

export type Flip7Player = {
  id: string;
  name: string;
  emoji?: string;
};

/**
 * One player's result in one round.
 *
 * `points` is the sum of their number and bonus cards — the 15 Extrapunkte for
 * a Flip 7 are added by the scorer, not typed in. `null` means "not entered
 * yet", which is what keeps a round from counting as finished.
 */
export type Flip7RoundEntry = {
  points: number | null;
  /** Drew a number they already had: the round scores 0 no matter what. */
  busted: boolean;
  /** Seven different number cards — ends the round and earns FLIP7_BONUS. */
  flip7: boolean;
  /** Joined the game after this round was played, so it never applied to them. */
  absent?: boolean;
};

export type Flip7Round = {
  entries: Record<string, Flip7RoundEntry>;
};

export type Flip7Game = {
  /** Identifies the match in the history, so re-finishing updates instead of duplicating. */
  id: string;
  gamemode: Flip7GamemodeKey;
  /** Points that end the game once someone reaches them (200 by the rulebook). */
  targetScore: number;
  players: Flip7Player[];
  /** Grows one round at a time — the game runs until the target is reached. */
  rounds: Flip7Round[];
  startedAt: number | null;
  /** Set only when the group confirms the end; a reached target just asks. */
  finishedAt: number | null;
};

export type Flip7MatchPlayer = {
  name: string;
  emoji?: string;
  score: number;
  /** Rounds this player actually took part in (entry filled, not absent). */
  roundsPlayed: number;
  flip7s: number;
  busts: number;
  /** Highest single-round score, Flip-7-Bonus included. */
  bestRound: number;
};

export type StoredFlip7Match = {
  id: string;
  players: Flip7MatchPlayer[];
  gamemode: Flip7GamemodeKey;
  targetScore: number;
  totalRounds: number;
  timestamp: string;
  durationMs?: number;
};
