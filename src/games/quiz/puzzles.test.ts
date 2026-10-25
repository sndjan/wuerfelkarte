import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import { SOLVER_TABLE_PATH, solverFromTable, type Solver } from "@/games/yatzy/solver";
import {
  applyKeep,
  applyScore,
  currentStreak,
  dateKey,
  generateDailyQuiz,
  gradeKeep,
  gradeScore,
  POINTS_PERFECT,
  pointsForLoss,
  pointsTier,
  puzzlePoints,
  reroll,
  startProgress,
  toTurnState,
} from "./puzzles";
import type { QuizPuzzle } from "./types";

let solver: Solver;
beforeAll(() => {
  const file = readFileSync(`public${SOLVER_TABLE_PATH}`);
  solver = solverFromTable(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
});

describe("toTurnState", () => {
  it("derives filled fields, upper sum and the Wunder flag from the card", () => {
    expect(toTurnState({ Dreier: 9, Sechser: 24, Wunder: 50, Chance: 22 })).toEqual({
      filled: ["Dreier", "Sechser", "Wunder", "Chance"],
      upperSum: 33,
      wunderScored: true,
    });
    expect(toTurnState({ Wunder: 0 }).wunderScored).toBe(false);
  });
});

describe("reroll", () => {
  it("replaces only dice that are not held, in order", () => {
    expect(reroll([1, 2, 3, 4, 5], [true, false, true, false, false], [6, 6, 1, 2, 3])).toEqual([
      1, 6, 3, 6, 1,
    ]);
  });
});

describe("grading", () => {
  it("gives no loss for the best keep and a positive loss otherwise", () => {
    expect(gradeKeep(solver, {}, [1, 2, 3, 3, 3], 2, [3, 3, 3])).toMatchObject({
      best: [3, 3, 3],
      loss: 0,
    });
    expect(gradeKeep(solver, {}, [1, 2, 3, 3, 3], 2, [1, 2, 3]).loss).toBeGreaterThan(1);
  });

  it("grades entering early as stopping plus choosing the field", () => {
    // 66661 with two rolls left: stopping now throws away the Wunder chance.
    const step = gradeScore(solver, {}, [6, 6, 6, 6, 1], 2, "Viererpasch");
    expect(step.points).toBe(25);
    expect(step.loss).toBeGreaterThan(1);
  });

  it("scores a puzzle by the expected points given away", () => {
    const puzzle: QuizPuzzle = { card: {}, dice: [1, 2, 3, 3, 3], rollsLeft: 0, nextRolls: [] };
    const best = gradeScore(solver, {}, puzzle.dice, 0, "Dreierpasch");
    const perfect = applyScore(solver, puzzle, startProgress(puzzle), best.best);
    expect(puzzlePoints(perfect)).toBe(POINTS_PERFECT);
    const twoSteps = { ...perfect, steps: [perfect.steps[0], { ...perfect.steps[0], loss: 0.4 }, { ...perfect.steps[0], loss: 0.6 }] };
    expect(puzzlePoints(twoSteps)).toBe(pointsForLoss(1));
  });

  it("takes points away smoothly with the expected points given away", () => {
    expect([0, 0.5, 1, 2, 3, 5, 7, 20].map(pointsForLoss)).toEqual([10, 8, 6, 3, 2, 1, 0, 0]);
  });

  it("keeps the full 10 for a loss-free puzzle only", () => {
    expect(pointsForLoss(0.06)).toBe(9);
  });

  it("sorts points into tiers", () => {
    expect([10, 9, 5, 4, 1, 0].map(pointsTier)).toEqual(["perfect", "good", "good", "close", "close", "miss"]);
  });
});

describe("generateDailyQuiz", () => {
  it("is the same for the same date and different for another", () => {
    const a = generateDailyQuiz(solver, "2026-10-25");
    expect(generateDailyQuiz(solver, "2026-10-25")).toEqual(a);
    expect(generateDailyQuiz(solver, "2026-10-26")).not.toEqual(a);
  });

  it("asks one puzzle each with 2, 1 and 0 rolls left on open cards", () => {
    for (const date of ["2026-01-01", "2026-06-15", "2026-10-25", "2027-02-28"]) {
      const puzzles = generateDailyQuiz(solver, date);
      expect(puzzles.map((p) => p.rollsLeft).sort()).toEqual([0, 1, 2]);
      for (const puzzle of puzzles) {
        expect(puzzle.dice).toHaveLength(5);
        expect(puzzle.nextRolls).toHaveLength(puzzle.rollsLeft);
        expect(Object.keys(puzzle.card).length).toBeLessThanOrEqual(10);
      }
    }
  });

  it("plays through a whole puzzle with the rerolls it ships", () => {
    const puzzle = generateDailyQuiz(solver, "2026-10-25").find((p) => p.rollsLeft === 2)!;
    let progress = startProgress(puzzle);
    progress = applyKeep(solver, puzzle, progress, [true, true, false, false, false]);
    expect(progress.rollsLeft).toBe(1);
    expect(progress.dice.slice(0, 2)).toEqual(puzzle.dice.slice(0, 2));
    expect(progress.dice.slice(2)).toEqual(puzzle.nextRolls[0].slice(0, 3));
    const open = solver.analyze(toTurnState(puzzle.card), progress.dice, 0)[0];
    progress = applyScore(solver, puzzle, progress, open.kind === "score" ? open.category : "Chance");
    expect(progress.done).toBe(true);
    expect(progress.steps.map((s) => s.kind)).toEqual(["keep", "score"]);
  });
});

describe("currentStreak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    const played = ["2026-10-22", "2026-10-23", "2026-10-24"];
    expect(currentStreak(played, "2026-10-24")).toBe(3);
    expect(currentStreak(played, "2026-10-25")).toBe(3);
    expect(currentStreak(played, "2026-10-26")).toBe(0);
    expect(currentStreak([...played, "2026-10-25"], "2026-10-25")).toBe(4);
  });

  it("crosses month boundaries", () => {
    expect(currentStreak(["2026-09-30", "2026-10-01"], "2026-10-01")).toBe(2);
  });
});

describe("dateKey", () => {
  it("formats the local date", () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("move rankings", () => {
  it("lists the top five moves and the player's own below them", () => {
    const step = gradeKeep(solver, {}, [1, 2, 3, 3, 3], 2, [1]);
    const moves = step.moves!;
    expect(moves.length).toBe(6);
    expect(moves.slice(0, 5).map((m) => m.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(moves[0]).toMatchObject({ kind: "keep", dice: [3, 3, 3], loss: 0, chosen: false });
    expect(moves[5]).toMatchObject({ kind: "keep", dice: [1], chosen: true, loss: step.loss });
    expect(moves[5].rank).toBeGreaterThan(5);
  });

  it("does not repeat the player's move when it is among the top five", () => {
    const moves = gradeKeep(solver, {}, [1, 2, 3, 3, 3], 2, [3, 3, 3]).moves!;
    expect(moves).toHaveLength(5);
    expect(moves.filter((m) => m.chosen)).toEqual([expect.objectContaining({ rank: 1 })]);
  });

  it("ranks entering early per field alongside rerolls, matching the grade", () => {
    const step = gradeScore(solver, {}, [6, 6, 6, 6, 1], 2, "Viererpasch");
    const own = step.moves!.find((m) => m.chosen)!;
    expect(own).toMatchObject({ kind: "score", category: "Viererpasch", points: 25 });
    expect(own.loss).toBeCloseTo(step.loss, 9);
    expect(step.moves![0]).toMatchObject({ kind: "keep", dice: [6, 6, 6, 6] });
  });
});
