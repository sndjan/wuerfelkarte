import { CATEGORIES, type Category, type Solver } from "@/games/yatzy/solver";
import { gradeKeep, gradeScore, rankMoves, stepPoints, toTurnState } from "@/games/quiz/puzzles";
import type { QuizStep, RollsLeft } from "@/games/quiz/types";
import type { StoredTrainingMatch, TrainingGame, TrainingTurnProgress } from "./types";

/**
 * Kniffel-Training as pure functions: a full solo game on real random dice,
 * where every decision — which dice to keep, when to stop, which field to
 * fill — is graded against the optimal solver, the same way as the quiz.
 */

export const TURNS = CATEGORIES.length;

export type Random = () => number;

const rollDie = (random: Random) => 1 + Math.floor(random() * 6);

const freshTurn = (): TrainingTurnProgress => ({
  rolled: false,
  dice: [1, 1, 1, 1, 1],
  held: [false, false, false, false, false],
  rollsLeft: 2,
  steps: [],
});

export function newGame(now: number = Date.now()): TrainingGame {
  return {
    id: `training-${now}`,
    startedAt: now,
    card: {},
    turns: [],
    current: freshTurn(),
  };
}

export const isFinished = (game: TrainingGame) => game.turns.length >= TURNS;

/** The turn's first roll: all five dice, no decision to grade. */
export function applyRoll(game: TrainingGame, random: Random = Math.random): TrainingGame {
  if (isFinished(game) || game.current.rolled) return game;
  return {
    ...game,
    current: {
      ...game.current,
      rolled: true,
      dice: game.current.dice.map(() => rollDie(random)),
      held: game.current.dice.map(() => false),
    },
  };
}

/** Grades which dice were kept, then rerolls the others. */
export function applyKeep(
  solver: Solver,
  game: TrainingGame,
  held: readonly boolean[],
  random: Random = Math.random,
): TrainingGame {
  const { current } = game;
  if (isFinished(game) || !current.rolled || current.rollsLeft === 0) return game;
  if (held.every(Boolean)) return game;
  const kept = current.dice.filter((_, i) => held[i]);
  const step = gradeKeep(solver, game.card, current.dice, current.rollsLeft as 1 | 2, kept);
  return {
    ...game,
    current: {
      ...current,
      dice: current.dice.map((d, i) => (held[i] ? d : rollDie(random))),
      held: [...held],
      rollsLeft: (current.rollsLeft - 1) as RollsLeft,
      steps: [...current.steps, step],
    },
  };
}

/** Grades the entry, writes it on the card and starts the next turn. */
export function applyScore(
  solver: Solver,
  game: TrainingGame,
  category: Category,
  now: number = Date.now(),
): TrainingGame {
  const { current } = game;
  if (isFinished(game) || !current.rolled) return game;
  const entry = solver
    .analyze(toTurnState(game.card), current.dice, 0)
    .find((o) => o.kind === "score" && o.category === category);
  if (!entry || entry.kind !== "score") return game;
  const step = gradeScore(solver, game.card, current.dice, current.rollsLeft, category);
  const turns = [
    ...game.turns,
    { steps: [...current.steps, step], category, points: entry.points, bonus: entry.bonus },
  ];
  return {
    ...game,
    card: { ...game.card, [category]: entry.points },
    turns,
    current: freshTurn(),
    finishedAt: turns.length >= TURNS ? now : undefined,
  };
}

/** The best move right now, for the hint button. */
export function bestMove(solver: Solver, game: TrainingGame) {
  const { current } = game;
  if (isFinished(game) || !current.rolled) return null;
  return rankMoves(solver, game.card, current.dice, current.rollsLeft)[0];
}

export function totalScore(game: TrainingGame): number {
  return game.turns.reduce((sum, turn) => sum + turn.points + turn.bonus, 0);
}

/** Every graded decision so far, finished turns first. */
export const allSteps = (game: TrainingGame): QuizStep[] => [
  ...game.turns.flatMap((turn) => turn.steps),
  ...game.current.steps,
];

/** The most recent decision, also right after a turn was entered. */
export function lastStep(game: TrainingGame): QuizStep | null {
  return allSteps(game).at(-1) ?? null;
}

export type TrainingStats = {
  decisions: number;
  optimal: number;
  /** Expected points given away in total. */
  loss: number;
  /** Average decision quality, 0–100 (100 = every move optimal). */
  rating: number;
};

export function trainingStats(game: TrainingGame): TrainingStats {
  const steps = allSteps(game);
  const loss = steps.reduce((sum, s) => sum + s.loss, 0);
  const rating =
    steps.length === 0
      ? 100
      : steps.reduce((sum, s) => sum + stepPoints(s.loss), 0) / steps.length;
  return {
    decisions: steps.length,
    optimal: steps.filter((s) => s.loss === 0).length,
    loss,
    rating: Math.round(rating),
  };
}

export type Verdict = "best" | "great" | "good" | "inaccurate" | "mistake";

/** How a single decision is judged by the expected points it gave away. */
export function verdict(loss: number): Verdict {
  if (loss === 0) return "best";
  if (loss < 1) return "great";
  if (loss < 3) return "good";
  if (loss < 8) return "inaccurate";
  return "mistake";
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  best: "Bester Zug",
  great: "Sehr gut",
  good: "Gut",
  inaccurate: "Ungenau",
  mistake: "Fehler",
};

/** The biggest mistakes of a game, worst first, with the turn they happened in. */
export function biggestMistakes(game: TrainingGame, count = 5) {
  return game.turns
    .flatMap((turn, index) => turn.steps.map((step) => ({ step, turn: index + 1 })))
    .filter(({ step }) => step.loss > 0)
    .sort((a, b) => b.step.loss - a.step.loss)
    .slice(0, count);
}

export function buildMatch(game: TrainingGame): StoredTrainingMatch {
  const stats = trainingStats(game);
  const finishedAt = game.finishedAt ?? Date.now();
  return {
    id: game.id,
    gamemode: "training",
    timestamp: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - game.startedAt,
    players: [{ name: "Du", score: totalScore(game) }],
    loss: stats.loss,
    decisions: stats.decisions,
    optimal: stats.optimal,
  };
}
