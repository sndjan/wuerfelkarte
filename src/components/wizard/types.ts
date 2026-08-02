export type WizardGamemodeKey = "Standard";

export type WizardPlayer = {
  id: string;
  name: string;
  emoji?: string;
};

/**
 * `null` means "not entered yet" — distinct from a deliberate 0. New players
 * joining a running game keep `null` for every round played before they came in,
 * so those rounds simply score nothing for them.
 */
export type WizardRound = {
  bids: Record<string, number | null>;
  tricks: Record<string, number | null>;
};

export type WizardPhase = "bids" | "tricks";

export type WizardGame = {
  gamemode: WizardGamemodeKey;
  /** Sum of all predictions must not equal the number of tricks in the round — a per-game rule toggle, independent of gamemode. */
  plusMinusOne: boolean;
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
  totalRounds: number;
  timestamp: string;
  durationMs?: number;
};
