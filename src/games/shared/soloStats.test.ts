import { describe, expect, it } from "vitest";

import type { QuizStep, StoredQuizMatch } from "@/games/quiz/types";
import type { StoredSpeedrunMatch } from "@/games/speedrun/types";
import type { StoredTrainingMatch } from "@/games/training/types";
import {
  lossBreakdown,
  longestStreak,
  mergeBreakdowns,
  quizSummary,
  speedrunSummary,
  trainingSummary,
  weakestFields,
} from "./soloStats";

const keep = (loss: number): QuizStep => ({ kind: "keep", dice: [1, 2, 3, 4, 5], rollsLeft: 2, kept: [], best: [], loss });
const score = (loss: number): QuizStep => ({
  kind: "score",
  dice: [1, 2, 3, 4, 5],
  rollsLeft: 0,
  category: "Chance",
  points: 15,
  best: "Chance",
  shouldRoll: false,
  loss,
});

describe("loss breakdown", () => {
  const breakdown = lossBreakdown([
    { steps: [keep(2), score(1)], category: "Chance" },
    { steps: [keep(0), score(3)], category: "Chance" },
    { steps: [keep(1)], category: "Einser" },
    { steps: [score(0)], category: "Sechser" },
    { steps: [score(0)], category: "Sechser" },
  ]);

  it("splits holding from entering and adds up per field", () => {
    expect(breakdown.keep).toBe(3);
    expect(breakdown.score).toBe(4);
    expect(breakdown.byCategory.Chance).toEqual({ loss: 6, turns: 2 });
  });

  it("names the costliest fields, leaving out one-offs and flawless ones", () => {
    expect(weakestFields(breakdown)).toEqual([{ category: "Chance", average: 3, turns: 2 }]);
  });

  it("merges breakdowns and skips missing ones", () => {
    const merged = mergeBreakdowns([breakdown, undefined, breakdown]);
    expect(merged.keep).toBe(6);
    expect(merged.byCategory.Einser).toEqual({ loss: 2, turns: 2 });
  });
});

it("finds the longest run of consecutive days", () => {
  expect(longestStreak([])).toBe(0);
  expect(longestStreak(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-03", "2026-11-01"])).toBe(3);
});

const at = (i: number) => new Date(Date.UTC(2026, 10, 1 + i)).toISOString();

it("sums up the quiz, counting only today's scale for points", () => {
  const day = (id: string, points: number[], scale?: number, gamemode = "daily"): StoredQuizMatch => ({
    id,
    gamemode,
    timestamp: `${id}T10:00:00.000Z`,
    players: [],
    points,
    losses: [],
    ...(scale ? { scale } : {}),
  });
  const s = quizSummary([
    day("2026-11-02", [100, 80, 90], 100),
    day("2026-11-01", [100, 100, 40], 100),
    day("2026-10-01", [3, 3, 3]),
    day("2026-11-03", [10, 10, 10], 100, "archive"),
  ]);
  expect(s).toMatchObject({ days: 4, bestDay: 270, perfectPuzzles: 3, longestStreak: 2 });
  expect(s.recent).toEqual([240, 270, 30]);
});

it("sums up training games", () => {
  const game = (i: number, score: number, loss: number): StoredTrainingMatch => ({
    id: `t${i}`,
    gamemode: "training",
    timestamp: at(i),
    players: [{ name: "Du", score }],
    loss,
    decisions: 10,
    optimal: 5,
  });
  const s = trainingSummary([game(1, 200, 12), game(0, 250, 20)]);
  expect(s).toMatchObject({ games: 2, averageScore: 225, bestScore: 250, optimalRate: 0.5, averageLoss: 16 });
  expect(s.recent).toEqual([20, 12]);
});

it("sums up Klassisch speedruns on random seeds only", () => {
  const run = (i: number, wertungMs: number, extra: Partial<StoredSpeedrunMatch> = {}) =>
    ({
      id: `s${i}`,
      gamemode: "classic",
      category: "classic",
      timestamp: at(i),
      players: [],
      timeMs: wertungMs,
      strafeMs: 0,
      wertungMs,
      score: 0,
      splits: [],
      loss: 0,
      decisions: 4,
      optimal: 3,
      ...extra,
    }) as StoredSpeedrunMatch;
  const s = speedrunSummary([
    run(0, 90_000),
    run(1, 80_000),
    run(2, 10_000, { customSeed: true }),
    run(3, 5_000, { category: "any" }),
  ]);
  expect(s).toMatchObject({ runs: 2, bestMs: 80_000, averageMs: 85_000, optimalRate: 0.75 });
});
