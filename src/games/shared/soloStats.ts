import type { QuizDay, QuizStep, StoredQuizMatch } from "@/games/quiz/types";
import { POINTS_PERFECT, dateKey } from "@/games/quiz/puzzles";
import type { StoredSpeedrunMatch } from "@/games/speedrun/types";
import type { StoredTrainingMatch } from "@/games/training/types";
import type { Category } from "@/games/yatzy/solver";

/**
 * Statistics of the solo modes — Quiz, Training and Speedrun — as pure
 * functions over what each mode stores. Every decision in them is graded by
 * the solver, so besides counts and bests there is a weakness to show: where
 * the expected points go.
 */

/** A turn as far as the weakness analysis cares: its decisions and its field. */
export type GradedTurn = { steps: readonly QuizStep[]; category: Category };

/**
 * Where the expected points went: holding the wrong dice or entering the
 * wrong field, and per field the turns that ended in it.
 */
export type LossBreakdown = {
  keep: number;
  score: number;
  byCategory: Partial<Record<Category, { loss: number; turns: number }>>;
};

export const emptyBreakdown = (): LossBreakdown => ({ keep: 0, score: 0, byCategory: {} });

/** The breakdown of a set of finished turns. */
export function lossBreakdown(turns: readonly GradedTurn[]): LossBreakdown {
  const result = emptyBreakdown();
  for (const turn of turns) {
    let turnLoss = 0;
    for (const step of turn.steps) {
      if (step.kind === "keep") result.keep += step.loss;
      else result.score += step.loss;
      turnLoss += step.loss;
    }
    const entry = result.byCategory[turn.category] ?? { loss: 0, turns: 0 };
    result.byCategory[turn.category] = { loss: entry.loss + turnLoss, turns: entry.turns + 1 };
  }
  return result;
}

/** Several breakdowns added up; missing ones (older stored games) are skipped. */
export function mergeBreakdowns(breakdowns: readonly (LossBreakdown | undefined)[]): LossBreakdown {
  const result = emptyBreakdown();
  for (const b of breakdowns) {
    if (!b) continue;
    result.keep += b.keep;
    result.score += b.score;
    for (const [category, value] of Object.entries(b.byCategory) as [Category, { loss: number; turns: number }][]) {
      const entry = result.byCategory[category] ?? { loss: 0, turns: 0 };
      result.byCategory[category] = { loss: entry.loss + value.loss, turns: entry.turns + value.turns };
    }
  }
  return result;
}

export type Weakness = { category: Category; average: number; turns: number };

/**
 * The fields whose turns give away the most expected points on average,
 * worst first. Fields seen fewer than `minTurns` times are left out: one bad
 * turn says little.
 */
export function weakestFields(breakdown: LossBreakdown, limit = 3, minTurns = 2): Weakness[] {
  return (Object.entries(breakdown.byCategory) as [Category, { loss: number; turns: number }][])
    .filter(([, v]) => v.turns >= minTurns && v.loss > 0)
    .map(([category, v]) => ({ category, average: v.loss / v.turns, turns: v.turns }))
    .sort((a, b) => b.average - a.average)
    .slice(0, limit);
}

/** The turns of a quiz day that were played to the end. */
export function quizDayTurns(day: QuizDay): GradedTurn[] {
  return day.progress.flatMap((progress) => {
    const entry = progress.steps.find((s) => s.kind === "score");
    return progress.done && entry?.kind === "score" ? [{ steps: progress.steps, category: entry.category }] : [];
  });
}

/** Days in a row, the longest ever, among the given dates. */
export function longestStreak(dates: readonly string[]): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    if (previous) {
      const next = new Date(`${previous}T12:00:00`);
      next.setDate(next.getDate() + 1);
      run = dateKey(next) === date ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

const average = (values: readonly number[]) =>
  values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;

const byTime = <T extends { timestamp: string }>(matches: readonly T[]) =>
  [...matches].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

/** A day's points on today's 0–100 scale per puzzle; null for older scales. */
const quizDayTotal = (match: StoredQuizMatch) =>
  match.scale === POINTS_PERFECT ? match.points.reduce((a, b) => a + b, 0) : null;

export type QuizSummary = {
  days: number;
  averageDay: number | null;
  bestDay: number | null;
  perfectPuzzles: number;
  longestStreak: number;
  /** Day totals, oldest first. */
  recent: number[];
};

export function quizSummary(matches: readonly StoredQuizMatch[], recent = 20): QuizSummary {
  const sorted = [...matches].sort((a, b) => a.id.localeCompare(b.id));
  const totals = sorted.map(quizDayTotal).filter((t): t is number => t !== null);
  return {
    days: matches.length,
    averageDay: average(totals),
    bestDay: totals.length ? Math.max(...totals) : null,
    perfectPuzzles: sorted
      .filter((m) => m.scale === POINTS_PERFECT)
      .reduce((n, m) => n + m.points.filter((p) => p >= POINTS_PERFECT).length, 0),
    longestStreak: longestStreak(matches.filter((m) => m.gamemode !== "archive").map((m) => m.id)),
    recent: totals.slice(-recent),
  };
}

export type TrainingSummary = {
  games: number;
  averageScore: number | null;
  bestScore: number | null;
  /** Share of decisions that were the best move, 0–1. */
  optimalRate: number | null;
  averageLoss: number | null;
  /** Expected points given away per game, oldest first. */
  recent: number[];
};

export function trainingSummary(matches: readonly StoredTrainingMatch[], recent = 20): TrainingSummary {
  const sorted = byTime(matches);
  const scores = sorted.map((m) => m.players[0]?.score ?? 0);
  const decisions = sorted.reduce((n, m) => n + m.decisions, 0);
  return {
    games: sorted.length,
    averageScore: average(scores),
    bestScore: scores.length ? Math.max(...scores) : null,
    optimalRate: decisions ? sorted.reduce((n, m) => n + m.optimal, 0) / decisions : null,
    averageLoss: average(sorted.map((m) => m.loss)),
    recent: sorted.map((m) => m.loss).slice(-recent),
  };
}

export type SpeedrunSummary = {
  runs: number;
  bestMs: number | null;
  averageMs: number | null;
  averageStrafeMs: number | null;
  optimalRate: number | null;
  /** Wertungszeit per run, oldest first. */
  recent: number[];
};

/** Klassisch runs on random seeds only: what the personal best is made of. */
export function speedrunSummary(matches: readonly StoredSpeedrunMatch[], recent = 20): SpeedrunSummary {
  const sorted = byTime(matches.filter((m) => m.category === "classic" && !m.customSeed));
  const times = sorted.map((m) => m.wertungMs);
  const decisions = sorted.reduce((n, m) => n + m.decisions, 0);
  return {
    runs: sorted.length,
    bestMs: times.length ? Math.min(...times) : null,
    averageMs: average(times),
    averageStrafeMs: average(sorted.map((m) => m.strafeMs)),
    optimalRate: decisions ? sorted.reduce((n, m) => n + m.optimal, 0) / decisions : null,
    recent: times.slice(-recent),
  };
}
