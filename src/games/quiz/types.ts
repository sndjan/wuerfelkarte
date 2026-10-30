import type { Category } from "@/games/yatzy/solver";
import type { MatchPlayer, StoredMatch } from "@/games/shared/types";

export type RollsLeft = 0 | 1 | 2;

/** The filled fields of a scorecard and what was entered in them. */
export type QuizCard = Partial<Record<Category, number>>;

/**
 * One daily puzzle: a scorecard mid-game and a whole turn on it. `dice` is the
 * turn's first roll; days stored before puzzles started from scratch also
 * have puzzles that begin mid-turn, with fewer rolls left.
 */
export type QuizPuzzle = {
  card: QuizCard;
  dice: number[];
  rollsLeft: RollsLeft;
  /**
   * The faces of the rolls still to come, one set of five per roll. Rerolled
   * dice take them by their place among the sorted dice, so everyone keeping
   * the same values sees the same dice, whichever of equal dice they hold.
   */
  nextRolls: number[][];
};

/**
 * One move in a decision's ranking: rerolling with some dice kept, or
 * entering the dice now. `loss` is measured against the best move.
 */
export type QuizMove = (
  | { kind: "keep"; dice: number[] }
  | { kind: "score"; category: Category; points: number }
) & {
  loss: number;
  /** 1 = best. */
  rank: number;
  chosen: boolean;
};

/** One graded decision. `loss` is the expected points given away (0 = best). */
export type QuizStep = (
  | {
      kind: "keep";
      dice: number[];
      rollsLeft: 1 | 2;
      kept: number[];
      best: number[];
      loss: number;
    }
  | {
      kind: "score";
      dice: number[];
      rollsLeft: RollsLeft;
      category: Category;
      points: number;
      best: Category;
      /** Entered with rolls left although rolling on was better. */
      shouldRoll: boolean;
      loss: number;
    }
) & {
  /**
   * The best moves and the player's own, at most six. Missing on steps
   * stored before rankings existed.
   */
  moves?: QuizMove[];
};

/** Where the player stands in one puzzle. */
export type PuzzleProgress = {
  /**
   * false until the player rolls all five dice to start the turn; that first
   * roll is no decision and is not graded. Missing on progress stored before
   * puzzles started from scratch — those dice count as rolled.
   */
  rolled?: boolean;
  dice: number[];
  /** The dice held for the last reroll; they stay held until tapped again. */
  held?: boolean[];
  rollsLeft: RollsLeft;
  steps: QuizStep[];
  done: boolean;
};

/** Today's quiz as stored while it is played. */
export type QuizDay = {
  /** Local date, YYYY-MM-DD — also the match id. */
  date: string;
  puzzles: QuizPuzzle[];
  progress: PuzzleProgress[];
  startedAt: number;
  finishedAt?: number;
};

export type QuizMatchPlayer = MatchPlayer;

/**
 * A finished day in the history; `id` is the date. `gamemode` is "daily"
 * when the day was started on its own date and "archive" when caught up later.
 */
export type StoredQuizMatch = StoredMatch<QuizMatchPlayer> & {
  /** Points per puzzle, 0–`scale`. */
  points: number[];
  /** Points for a perfect puzzle; missing on days from older scales (0–10 or 0–3). */
  scale?: number;
  /** Expected points given away per puzzle. */
  losses: number[];
};
