/** Types every game shares. Game-specific shapes live in the game's own folder. */

/**
 * A player in the app-wide roster, independent of any running game. The lobby
 * of every game selects from this one list.
 */
export type RosterPlayer = {
  id: string;
  name: string;
  emoji: string;
  active: boolean;
  /** Order in which the player was picked; drives seating order. `null` when inactive. */
  selectionOrder: number | null;
};

export const EMOJI_OPTIONS = ["🦄", "🐶", "🦝", "🐸", "🐼", "🦊", "🐻", "😺"];

/** A player inside a running game. */
export type GamePlayer = {
  id: string;
  name: string;
  emoji?: string;
};

/** A player with their current total — what the scoreboard and share text need. */
export type ScoredPlayer = GamePlayer & { score: number };

/** The minimum a finished match records per player; games extend this. */
export type MatchPlayer = {
  name: string;
  emoji?: string;
  score: number;
};

/**
 * One finished match in a game's history. `id` makes finishing a corrected or
 * resumed game update its own entry instead of adding a second one.
 */
export type StoredMatch<TPlayer extends MatchPlayer = MatchPlayer> = {
  id: string;
  players: TPlayer[];
  gamemode: string;
  timestamp: string;
  durationMs?: number;
};
