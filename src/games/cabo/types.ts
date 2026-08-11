/** Only one mode so far — the union keeps the door open for variants. */
export type CaboGamemodeKey = "Standard";

export type CaboPlayer = {
  id: string;
  name: string;
  emoji?: string;
};

/**
 * One player's result in one round.
 *
 * `cardSum` is what their own remaining cards add up to once the round ends —
 * the app works out who won, the Cabo penalty and the special hand from this
 * and the other players' entries, exactly like the physical scoring sheet
 * would. `null` means "not entered yet", which is what keeps a round from
 * counting as finished.
 */
export type CaboRoundEntry = {
  cardSum: number | null;
  /** Said "Cabo" this round — at most one player per round. */
  calledCabo: boolean;
  /** Auslage zeigt 12-12-13-13: 0 Punkte für die Person, 50 für alle anderen. */
  specialHand: boolean;
  /** Joined the game after this round was played, so it never applied to them. */
  absent?: boolean;
};

export type CaboRound = {
  entries: Record<string, CaboRoundEntry>;
};

export type CaboGame = {
  /** Identifies the match in the history, so re-finishing updates instead of duplicating. */
  id: string;
  gamemode: CaboGamemodeKey;
  /** Points that end the game once someone goes past them (100 by the rulebook). */
  targetScore: number;
  players: CaboPlayer[];
  /** Grows one round at a time — the game runs until the target is passed. */
  rounds: CaboRound[];
  startedAt: number | null;
  /** Set only when the group confirms the end; a passed target just asks. */
  finishedAt: number | null;
};

export type CaboMatchPlayer = {
  name: string;
  emoji?: string;
  score: number;
  /** Rounds this player actually took part in (entry filled, not absent). */
  roundsPlayed: number;
  /** Rounds this player won outright (their entry scored 0). */
  roundsWon: number;
  caboCalls: number;
};

export type StoredCaboMatch = {
  id: string;
  players: CaboMatchPlayer[];
  gamemode: CaboGamemodeKey;
  targetScore: number;
  totalRounds: number;
  timestamp: string;
  durationMs?: number;
};
