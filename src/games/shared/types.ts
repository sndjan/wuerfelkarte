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
  /**
   * Names the player had before taking a linked account's name, so matches
   * still recorded under one are renamed too.
   */
  formerNames?: string[];
};

/**
 * The characters a player can pick (Profil → Charakter, lobbies): only
 * animals with an animated Noto emoji, so every one of them moves when tapped.
 */
export const EMOJI_OPTIONS = [
  "🦄", "🦦", "🦝", "🐸", "🐼", "🦊", "🐻", "😺",
  "🐙", "🦁", "🐧", "🦉", "🐝", "🐢", "🐬", "🦖",
];

/**
 * Characters that used to be pickable. Players may still carry them, so they
 * keep their Noto drawing (`npm run emoji` finds them here) but are no longer offered.
 */
export const RETIRED_EMOJI = [
  "🐶", "🐯", "🐨", "🐷", "🐵", "🐔", "🐲", "👻", "🤖",
  "👽", "🧙", "🥷", "🤠", "🎩", "🚀",
];

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
