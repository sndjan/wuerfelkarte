import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CATEGORIES, SOLVER_TABLE_PATH, solverFromTable, type Solver } from "@/games/yatzy/solver";
import { bestMove } from "@/games/training/game";
import { formatDelta, formatSeconds, formatTime } from "./config";
import { bucketIndex, standing } from "./distribution";
import { goldSegments, personalBest, splitMark, sumOfBest } from "./records";
import { runningSpeedrunGame } from "./resume";
import {
  TURNS,
  applyKeep,
  applyRoll,
  applyScore,
  buildMatch,
  dailySeed,
  elapsedMs,
  isFinished,
  newRun,
  splits,
  strafeMs,
  turnDice,
} from "./run";
import { dailyAttempted, markDailyAttempted, speedrunStorage } from "./storage";
import type { SpeedrunCategory, SpeedrunGame, StoredSpeedrunMatch } from "./types";

let solver: Solver;

beforeAll(() => {
  const file = readFileSync(`public${SOLVER_TABLE_PATH}`);
  solver = solverFromTable(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
});

beforeEach(() => localStorage.clear());

/** Plays a whole run with the solver's moves, `step` ms per decision. */
function playOptimal(game: SpeedrunGame, step = 1000): SpeedrunGame {
  let now = 0;
  game = applyRoll(game, now);
  while (!isFinished(game)) {
    now += step;
    if (!game.current.rolled) {
      game = applyRoll(game, now);
      continue;
    }
    const best = bestMove(solver, game)!;
    if (best.kind === "keep") {
      const pool = [...best.dice];
      const held = game.current.dice.map((d) => {
        const at = pool.indexOf(d);
        if (at === -1) return false;
        pool.splice(at, 1);
        return true;
      });
      game = applyKeep(solver, game, held);
    } else {
      game = applyScore(solver, game, best.category, now);
    }
  }
  return game;
}

/** Plays a whole run badly: never rerolls, enters the first field the card allows. */
function playCareless(game: SpeedrunGame, step = 500): SpeedrunGame {
  let now = 0;
  while (!isFinished(game)) {
    now += step;
    game = applyRoll(game, now);
    for (const category of CATEGORIES) {
      const next = applyScore(solver, game, category, now);
      if (next !== game) {
        game = next;
        break;
      }
    }
  }
  return game;
}

describe("dice from the seed", () => {
  it("gives every turn the same dice for the same seed", () => {
    expect(turnDice("abc")).toEqual(turnDice("abc"));
    expect(turnDice("abc")).not.toEqual(turnDice("abd"));
    expect(turnDice("abc")).toHaveLength(TURNS);
  });

  it("uses the day's seed for a Tagesrun", () => {
    const run = newRun("daily", { date: "2026-11-08", ranked: true, now: 0 });
    expect(run.seed).toBe(dailySeed("2026-11-08"));
    expect(run.ranked).toBe(true);
    expect(newRun("classic", { now: 0 }).seed).not.toBe(newRun("classic", { now: 0 }).seed);
  });

  it("rerolls the same for everyone who keeps the same values", () => {
    const seed = "same-dice";
    let a = applyRoll(newRun("daily", { date: "x", seed }), 0);
    let b = applyRoll(newRun("daily", { date: "x", seed }), 0);
    a = { ...a, current: { ...a.current, dice: [3, 3, 5, 1, 6] } };
    b = { ...b, current: { ...b.current, dice: [3, 3, 5, 1, 6] } };
    // Holding the first or the second 3 makes no difference.
    const heldA = applyKeep(solver, a, [true, false, false, false, false]);
    const heldB = applyKeep(solver, b, [false, true, false, false, false]);
    expect([...heldA.current.dice].sort()).toEqual([...heldB.current.dice].sort());
  });

  it("starts the clock on the first roll only", () => {
    const game = applyRoll(newRun("classic", { now: 0 }), 5000);
    expect(game.clockStart).toBe(5000);
    expect(elapsedMs(game, 7500)).toBe(2500);
    expect(applyRoll(game, 9000)).toBe(game);
  });
});

describe("Wertungszeit", () => {
  it("has no penalty when every decision is the solver's", () => {
    const run = playOptimal(newRun("classic", { now: 0 }));
    expect(run.turns).toHaveLength(TURNS);
    expect(strafeMs(run)).toBe(0);
    const match = buildMatch(run);
    expect(match.wertungMs).toBe(match.timeMs);
    expect(match.splits).toHaveLength(TURNS);
  });

  it("charges a second per expected point given away, whatever the card scores", () => {
    const run = playCareless(newRun("classic", { now: 0, seed: "careless" }));
    const match = buildMatch(run);
    expect(match.loss).toBeGreaterThan(10);
    expect(match.strafeMs).toBe(Math.round(match.loss * 10) * 100);
    expect(match.wertungMs).toBe(match.timeMs + match.strafeMs);
    // The last split is the whole run's Wertungszeit.
    expect(match.splits.at(-1)).toBe(match.wertungMs);
  });

  it("ignores the penalty in Any%", () => {
    const run = playCareless(newRun("any", { now: 0, seed: "careless" }));
    expect(strafeMs(run)).toBe(0);
    expect(buildMatch(run).wertungMs).toBe(buildMatch(run).timeMs);
    expect(splits(run).at(-1)).toBe(elapsedMs(run));
  });

  it("gives perfect play no penalty, whatever the dice", () => {
    for (const seed of ["luck-1", "luck-2", "luck-3"]) {
      expect(strafeMs(playOptimal(newRun("classic", { now: 0, seed })))).toBe(0);
    }
  });
});

const match = (
  id: string,
  category: SpeedrunCategory,
  segments: number[],
): StoredSpeedrunMatch => {
  const cumulative = segments.reduce<number[]>((acc, s) => [...acc, (acc.at(-1) ?? 0) + s], []);
  const total = cumulative.at(-1)!;
  return {
    id,
    gamemode: category,
    timestamp: new Date(0).toISOString(),
    players: [{ name: "Du", score: 200 }],
    category,
    timeMs: total,
    strafeMs: 0,
    wertungMs: total,
    score: 200,
    splits: cumulative,
    loss: 0,
    decisions: 30,
    optimal: 30,
  };
};

describe("records", () => {
  const slow = match("slow", "classic", Array(TURNS).fill(8000));
  const fast = match("fast", "classic", [5000, ...Array(TURNS - 1).fill(7000)]);
  const other = match("other", "any", Array(TURNS).fill(1000));

  it("finds the personal best of a category", () => {
    expect(personalBest([slow, fast, other], "classic")?.id).toBe("fast");
    expect(personalBest([slow, fast, other], "classic", "fast")?.id).toBe("slow");
    expect(personalBest([], "classic")).toBeNull();
  });

  it("adds up the gold segments", () => {
    const gold = goldSegments([slow, fast], "classic");
    expect(gold[0]).toBe(5000);
    expect(sumOfBest(gold)).toBe(5000 + 7000 * (TURNS - 1));
    expect(sumOfBest(goldSegments([], "classic"))).toBeNull();
  });

  it("marks splits gold, ahead or behind", () => {
    const gold = goldSegments([slow, fast], "classic");
    expect(splitMark([4000], 0, fast, gold)).toBe("gold");
    expect(splitMark([4000, 11500], 1, fast, gold)).toBe("ahead");
    expect(splitMark([6000, 13500], 1, fast, gold)).toBe("behind");
  });
});

describe("storage and resume", () => {
  it("resumes a started run and drops a broken one", () => {
    expect(runningSpeedrunGame()).toBeNull();
    const run = applyRoll(newRun("classic", { now: 0 }), 0);
    speedrunStorage.saveGame(run);
    expect(runningSpeedrunGame()?.progress).toContain("Zug 1 von 13");
    speedrunStorage.saveGame({ ...run, turnEnds: [1] });
    expect(speedrunStorage.loadGame()).toBeNull();
  });

  it("remembers the day's ranked attempt", () => {
    expect(dailyAttempted("2026-11-08")).toBe(false);
    markDailyAttempted("2026-11-08");
    expect(dailyAttempted("2026-11-08")).toBe(true);
    expect(dailyAttempted("2026-11-09")).toBe(false);
  });
});

describe("formatting and distribution", () => {
  it("formats times German style", () => {
    expect(formatTime(91_234)).toBe("1:31,2");
    expect(formatTime(5_000)).toBe("0:05,0");
    expect(formatSeconds(12_640)).toBe("12,6");
    expect(formatDelta(-1_200)).toBe("−1,2");
    expect(formatDelta(800)).toBe("+0,8");
  });

  it("buckets and ranks Wertungszeiten, lower is better", () => {
    expect(bucketIndex(60)).toBe(0);
    expect(bucketIndex(95)).toBe(2);
    expect(bucketIndex(400)).toBe(6);
    const counts = [
      { seconds: 80, players: 1 },
      { seconds: 100, players: 2 },
      { seconds: 140, players: 1 },
    ];
    expect(standing(counts, 100, true)).toEqual({ others: 3, fasterThan: 33 });
  });
});
