export type WizardGamemodeKey = "Standard" | "25 Jahre Edition";

/** The seven Sonderkarten of the anniversary edition. */
export type WizardSpecialCard =
  | "gestaltenwandler"
  | "drache"
  | "fee"
  | "bombe"
  | "werwolf"
  | "jongleur"
  | "wolke";

export type WizardPlayer = {
  id: string;
  name: string;
  emoji?: string;
};

/** Which player has to change their bid, and by how much (Wolke). */
export type WizardWolke = {
  playerId: string;
  delta: 1 | -1;
};

/**
 * `null` means "not entered yet" — distinct from a deliberate 0. New players
 * joining a running game keep `null` for every round played before they came in,
 * so those rounds simply score nothing for them.
 */
export type WizardRound = {
  bids: Record<string, number | null>;
  tricks: Record<string, number | null>;
  /** A trick containing the Bombe belongs to nobody, so one trick goes missing. */
  bombTrick?: boolean;
  /** Whoever ended the round holding the Wolke must shift their bid by ±1. */
  wolke?: WizardWolke | null;
};

export type WizardPhase = "bids" | "tricks";

export type WizardGame = {
  gamemode: WizardGamemodeKey;
  /** Sum of all predictions must not equal the number of tricks in the round — a per-game rule toggle, independent of gamemode. */
  plusMinusOne: boolean;
  /** Sonderkarten shuffled into the deck; empty in Standard. Fixed once the game starts. */
  specialCards: WizardSpecialCard[];
  players: WizardPlayer[];
  totalRounds: number;
  rounds: WizardRound[];
  /** Index into `players` of whoever deals round 1; rotates left every round. */
  dealerStart: number;
  startedAt: number | null;
  finishedAt: number | null;
};

export type WizardMatchPlayer = {
  name: string;
  emoji?: string;
  score: number;
  /** Rounds this player predicted exactly right. */
  exactBids: number;
  /** Rounds this player actually took part in (both values entered). */
  roundsPlayed: number;
};

export type StoredWizardMatch = {
  players: WizardMatchPlayer[];
  gamemode: WizardGamemodeKey;
  plusMinusOne: boolean;
  /** Kept for later analysis; matches of one gamemode are pooled regardless of it. */
  specialCards?: WizardSpecialCard[];
  totalRounds: number;
  timestamp: string;
  durationMs?: number;
};
