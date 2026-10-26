import type { Category } from "@/games/yatzy/solver";

import { pointsTier, type PointsTier } from "./puzzles";
import type { QuizMove, QuizStep } from "./types";

/** How the result screen words one decision. */
export type StepFeedback = {
  /** What the player did. */
  chosen: string;
  /** The better move, or null when the player's move was the best. */
  better: string | null;
  loss: number;
};

/**
 * How the quiz names a field. The solver's key for five of a kind is "Wunder",
 * the name from the Yatzy modes; the Kniffel-Quiz calls it Kniffel.
 */
export const categoryLabel = (category: Category) =>
  category === "Wunder" ? "Kniffel" : category;

const diceText = (dice: readonly number[]) => dice.join(" ");

const entryText = (category: Category, points: number) =>
  points === 0 ? `${categoryLabel(category)} streichen` : `${categoryLabel(category)} (${points})`;

const keepText = (kept: readonly number[]) =>
  kept.length === 0 ? "Alle neu würfeln" : `${diceText(kept)} halten`;

export const moveText = (move: QuizMove) =>
  move.kind === "keep" ? keepText(move.dice) : entryText(move.category, move.points);

export function describeStep(step: QuizStep): StepFeedback {
  // The ranking knows the true best move, which may be of the other kind.
  const best = step.moves?.[0];
  if (best && step.loss > 0) {
    const chosen = step.kind === "keep" ? keepText(step.kept) : entryText(step.category, step.points);
    return { chosen, better: moveText(best), loss: step.loss };
  }
  if (step.kind === "keep") {
    return {
      chosen: keepText(step.kept),
      better: step.loss > 0 ? keepText(step.best) : null,
      loss: step.loss,
    };
  }
  const better = step.shouldRoll ? "Weiterwürfeln" : categoryLabel(step.best);
  return {
    chosen: entryText(step.category, step.points),
    better: step.loss > 0 ? better : null,
    loss: step.loss,
  };
}

/** "0,4" — one decimal, German style, and never "0,0" for a real loss. */
export const formatLoss = (loss: number) =>
  Math.max(loss, 0.1).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const TIER_LABELS: Record<PointsTier, string> = {
  perfect: "Perfekt",
  good: "Gut",
  close: "Knapp",
  miss: "Daneben",
};

export const pointsLabel = (points: number) => TIER_LABELS[pointsTier(points)];
