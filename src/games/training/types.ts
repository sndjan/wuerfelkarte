import type { Category } from "@/games/yatzy/solver";
import type { QuizCard, QuizStep, RollsLeft } from "@/games/quiz/types";
import type { MatchPlayer, StoredMatch } from "@/games/shared/types";

/** The turn being played. */
export type TrainingTurnProgress = {
  /** false until the five dice of the turn's first roll are thrown. */
  rolled: boolean;
  dice: number[];
  /** The dice held for the last reroll; they stay held until tapped again. */
  held: boolean[];
  /** Rerolls still allowed once rolled (2 → 1 → 0). */
  rollsLeft: RollsLeft;
  /** Every graded decision of this turn so far. */
  steps: QuizStep[];
};

/** A finished turn: its graded decisions and what was entered. */
export type TrainingTurn = {
  steps: QuizStep[];
  category: Category;
  points: number;
  /** Upper-section bonus and extra-Kniffel bonus this entry earned. */
  bonus: number;
};

/** A whole solo game of Kniffel, graded move by move. */
export type TrainingGame = {
  id: string;
  startedAt: number;
  finishedAt?: number;
  card: QuizCard;
  turns: TrainingTurn[];
  current: TrainingTurnProgress;
};

export type StoredTrainingMatch = StoredMatch<MatchPlayer> & {
  /** Expected points given away over the whole game. */
  loss: number;
  decisions: number;
  /** Decisions that matched the best move. */
  optimal: number;
};
