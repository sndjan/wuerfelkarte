import type { MatchPlayer, StoredMatch } from "@/games/shared/types";
import type { TrainingGame } from "@/games/training/types";

/**
 * Any%: time only. Klassisch: time plus a second per expected point given
 * away. Tagesrun: Klassisch on dice everyone shares for the day.
 */
export type SpeedrunCategory = "any" | "classic" | "daily";

/** The dice of one turn, fixed by the run's seed. */
export type TurnDice = {
  first: number[];
  /** Faces for the first and second reroll, handed out by sorted slot. */
  next: [number[], number[]];
};

/**
 * A run is a training game — the same card, turns and graded steps — plus
 * the clock and the seed its dice come from.
 */
export type SpeedrunGame = TrainingGame & {
  category: SpeedrunCategory;
  /** Every die of the run follows from it, so a run can always be replayed. */
  seed: string;
  /** Tagesrun only: the day as YYYY-MM-DD. */
  date?: string;
  /** Tagesrun only: false for attempts after the day's first. */
  ranked?: boolean;
  /** Wall-clock ms of the first roll; the clock never pauses. */
  clockStart?: number;
  /** ms since clockStart at which each finished turn was entered. */
  turnEnds: number[];
};

export type StoredSpeedrunMatch = StoredMatch<MatchPlayer> & {
  category: SpeedrunCategory;
  date?: string;
  ranked?: boolean;
  timeMs: number;
  /** One second per expected point given away; 0 in Any%. */
  strafeMs: number;
  /** timeMs + strafeMs — what the run is ranked by. */
  wertungMs: number;
  /** The card's points: shown, never ranked. */
  score: number;
  /** Cumulative Wertungszeit at the end of each turn. */
  splits: number[];
  loss: number;
  decisions: number;
  optimal: number;
};
