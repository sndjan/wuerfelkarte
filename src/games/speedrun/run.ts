import type { Category, Solver } from "@/games/yatzy/solver";
import { gradeKeep, reroll, seededRandom } from "@/games/quiz/puzzles";
import type { RollsLeft } from "@/games/quiz/types";
import {
  TURNS,
  allSteps,
  applyScore as applyTrainingScore,
  isFinished,
  newGame as newTrainingGame,
  totalScore,
  trainingStats,
} from "@/games/training/game";
import { STRAFE_MS_PER_POINT } from "./config";
import type { SpeedrunCategory, SpeedrunGame, StoredSpeedrunMatch, TurnDice } from "./types";

/**
 * Kniffel-Speedrun as pure functions. A run is a training game against the
 * clock: every decision is graded by the solver as it is made (well under a
 * millisecond), but nothing is shown about it but the running penalty.
 *
 * All dice follow from the run's seed: each turn has a fixed first roll and
 * fixed faces for its two rerolls, handed out by sorted slot as in the quiz.
 * On the Tagesrun's shared seed everyone who keeps the same values sees the
 * same dice — the result can only differ by how they decided.
 */

export { TURNS, isFinished, totalScore };

export const dailySeed = (date: string) => `kniffel-speedrun:${date}`;

const fiveDice = (random: () => number) =>
  Array.from({ length: 5 }, () => 1 + Math.floor(random() * 6));

/** Every turn's dice for a seed. */
export function turnDice(seed: string): TurnDice[] {
  const random = seededRandom(seed);
  return Array.from({ length: TURNS }, () => ({
    first: fiveDice(random),
    next: [fiveDice(random), fiveDice(random)],
  }));
}

const diceOfTurn = (game: SpeedrunGame) => turnDice(game.seed)[game.turns.length];

type NewRunOptions = {
  now?: number;
  /** Tagesrun: the day, and whether this attempt is the day's ranked one. */
  date?: string;
  ranked?: boolean;
  /** Defaults to the day's seed for a Tagesrun and a fresh one otherwise. */
  seed?: string;
};

export function newRun(category: SpeedrunCategory, options: NewRunOptions = {}): SpeedrunGame {
  const now = options.now ?? Date.now();
  const daily = category === "daily" && options.date !== undefined;
  const seed =
    options.seed ??
    (daily ? dailySeed(options.date!) : `free:${now}:${Math.random().toString(36).slice(2)}`);
  return {
    ...newTrainingGame(now),
    id: `speedrun-${now}`,
    category,
    seed,
    ...(daily ? { date: options.date, ranked: options.ranked ?? true } : {}),
    turnEnds: [],
  };
}

export const isStarted = (game: SpeedrunGame) => game.clockStart !== undefined;

/** The turn's first roll; the run's first one starts the clock. */
export function applyRoll(game: SpeedrunGame, now: number = Date.now()): SpeedrunGame {
  if (isFinished(game) || game.current.rolled) return game;
  return {
    ...game,
    clockStart: game.clockStart ?? now,
    current: {
      ...game.current,
      rolled: true,
      dice: [...diceOfTurn(game).first],
      held: game.current.dice.map(() => false),
    },
  };
}

/** Grades which dice were kept, then rerolls the others from the seed. */
export function applyKeep(solver: Solver, game: SpeedrunGame, held: readonly boolean[]): SpeedrunGame {
  const { current } = game;
  if (isFinished(game) || !current.rolled || current.rollsLeft === 0) return game;
  if (held.every(Boolean)) return game;
  const kept = current.dice.filter((_, i) => held[i]);
  const step = gradeKeep(solver, game.card, current.dice, current.rollsLeft as 1 | 2, kept);
  const faces = diceOfTurn(game).next[2 - current.rollsLeft];
  return {
    ...game,
    current: {
      ...current,
      dice: reroll(current.dice, held, faces),
      held: [...held],
      rollsLeft: (current.rollsLeft - 1) as RollsLeft,
      steps: [...current.steps, step],
    },
  };
}

/** Grades the entry, writes it on the card and records the turn's time. */
export function applyScore(
  solver: Solver,
  game: SpeedrunGame,
  category: Category,
  now: number = Date.now(),
): SpeedrunGame {
  if (game.clockStart === undefined) return game;
  const next = applyTrainingScore(solver, game, category, now);
  if (next === game) return game;
  return { ...game, ...next, turnEnds: [...game.turnEnds, now - game.clockStart] };
}

/** Real time on the clock: running, or stopped at the last entry. */
export function elapsedMs(game: SpeedrunGame, now: number = Date.now()): number {
  if (game.clockStart === undefined) return 0;
  return (game.finishedAt ?? now) - game.clockStart;
}

const lossToMs = (loss: number) => Math.round((loss * STRAFE_MS_PER_POINT) / 100) * 100;

/** Penalty so far, rounded to a tenth of a second; always 0 in Any%. */
export function strafeMs(game: SpeedrunGame): number {
  if (game.category === "any") return 0;
  return lossToMs(allSteps(game).reduce((sum, step) => sum + step.loss, 0));
}

/** Cumulative Wertungszeit at the end of every finished turn. */
export function splits(game: SpeedrunGame): number[] {
  let loss = 0;
  return game.turnEnds.map((end, i) => {
    if (game.category !== "any") loss += game.turns[i].steps.reduce((sum, s) => sum + s.loss, 0);
    return end + lossToMs(loss);
  });
}

export function buildMatch(game: SpeedrunGame): StoredSpeedrunMatch {
  const stats = trainingStats(game);
  const timeMs = elapsedMs(game);
  const strafe = strafeMs(game);
  const score = totalScore(game);
  return {
    id: game.id,
    gamemode: game.category,
    timestamp: new Date(game.finishedAt ?? Date.now()).toISOString(),
    durationMs: timeMs,
    players: [{ name: "Du", score }],
    category: game.category,
    ...(game.date !== undefined ? { date: game.date, ranked: game.ranked } : {}),
    timeMs,
    strafeMs: strafe,
    wertungMs: timeMs + strafe,
    score,
    splits: splits(game),
    loss: stats.loss,
    decisions: stats.decisions,
    optimal: stats.optimal,
  };
}
