import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import { SOLVER_TABLE_PATH, solverFromTable, type Solver } from "@/games/yatzy/solver";
import {
  applyKeep,
  applyRoll,
  applyScore,
  currentStreak,
  dailyStreak,
  dateKey,
  isArchiveDate,
  generateDailyQuiz,
  gradeKeep,
  gradeScore,
  POINTS_PERFECT,
  pointsTier,
  puzzlePoints,
  reroll,
  startProgress,
  stepPoints,
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
  it("replaces only dice that are not held, each with the face at its place by value", () => {
    expect(reroll([1, 2, 3, 4, 5], [true, false, true, false, false], [6, 5, 4, 2, 3])).toEqual([
      1, 5, 3, 2, 3,
    ]);
    expect(reroll([5, 1, 4, 2, 3], [false, false, false, false, false], [6, 5, 4, 2, 3])).toEqual([
      3, 6, 2, 5, 4,
    ]);
  });

  it("lands the same whichever of equal dice is held", () => {
    const faces = [1, 6, 3, 4, 5];
    const a = reroll([5, 5, 2, 2, 3], [false, false, true, false, false], faces);
    const b = reroll([5, 5, 2, 2, 3], [false, false, false, true, false], faces);
    const c = reroll([5, 5, 2, 2, 3], [false, true, false, true, false], faces);
    const d = reroll([5, 5, 2, 2, 3], [true, false, true, false, false], faces);
    expect([...a].sort()).toEqual([...b].sort());
    expect([...c].sort()).toEqual([...d].sort());
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
    const perfect = applyScore(solver, puzzle, applyRoll(startProgress(puzzle)), best.best);
    expect(puzzlePoints(perfect)).toBe(POINTS_PERFECT);
    // Two perfect decisions and one near miss still make a good puzzle.
    const nearMiss = { ...perfect, steps: [perfect.steps[0], perfect.steps[0], { ...perfect.steps[0], loss: 3.1 }] };
    expect(puzzlePoints(nearMiss)).toBe(89);
    expect(pointsTier(puzzlePoints(nearMiss))).toBe("good");
  });

  it("takes points away gently with the expected points given away", () => {
    expect([0, 1, 3, 5, 10, 20].map((loss) => Math.round(stepPoints(loss)))).toEqual([100, 88, 69, 54, 29, 8]);
  });

  it("keeps the full 100 for a loss-free puzzle only", () => {
    const step = gradeScore(solver, {}, [1, 2, 3, 3, 3], 0, "Dreierpasch");
    const progress = { dice: step.dice, rollsLeft: 0 as const, done: true, steps: [{ ...step, loss: 0.06 }] };
    expect(puzzlePoints(progress)).toBe(99);
  });

  it("sorts points into tiers", () => {
    expect([100, 99, 93, 92, 75, 74, 40, 39, 0].map(pointsTier)).toEqual([
      "perfect", "great", "great", "good", "good", "close", "close", "miss", "miss",
    ]);
  });
});

describe("generateDailyQuiz", () => {
  it("is the same for the same date and different for another", () => {
    const a = generateDailyQuiz(solver, "2026-10-25");
    expect(generateDailyQuiz(solver, "2026-10-25")).toEqual(a);
    expect(generateDailyQuiz(solver, "2026-10-26")).not.toEqual(a);
  });

  it("asks three whole turns on open cards", () => {
    for (const date of ["2026-01-01", "2026-06-15", "2026-10-25", "2027-02-28"]) {
      const puzzles = generateDailyQuiz(solver, date);
      expect(puzzles).toHaveLength(3);
      for (const puzzle of puzzles) {
        expect(puzzle.rollsLeft).toBe(2);
        expect(puzzle.dice).toHaveLength(5);
        expect(puzzle.nextRolls).toHaveLength(2);
        expect(Object.keys(puzzle.card).length).toBeLessThanOrEqual(10);
      }
    }
  });

  it("plays through a whole puzzle with the rerolls it ships", () => {
    const puzzle = generateDailyQuiz(solver, "2026-10-25")[0];
    let progress = startProgress(puzzle);
    expect(applyKeep(solver, puzzle, progress, [false, false, false, false, false])).toBe(progress);
    progress = applyRoll(progress);
    expect(progress).toMatchObject({ rolled: true, dice: puzzle.dice, rollsLeft: 2, steps: [] });
    progress = applyKeep(solver, puzzle, progress, [true, true, false, false, false]);
    expect(progress.rollsLeft).toBe(1);
    expect(progress.dice.slice(0, 2)).toEqual(puzzle.dice.slice(0, 2));
    expect(progress.dice).toEqual(
      reroll(puzzle.dice, [true, true, false, false, false], puzzle.nextRolls[0]),
    );
    expect(progress.held).toEqual([true, true, false, false, false]);
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

describe("dailyStreak", () => {
  it("leaves out days caught up from the archive", () => {
    const match = (id: string, gamemode: string) =>
      ({ id, gamemode, timestamp: "", players: [], points: [], losses: [] });
    const matches = [match("2026-10-24", "daily"), match("2026-10-25", "archive"), match("2026-10-26", "daily")];
    expect(dailyStreak(matches, "2026-10-26")).toBe(1);
  });
});

describe("isArchiveDate", () => {
  it("offers real past days from the archive start to yesterday", () => {
    expect(isArchiveDate("2026-10-25", "2026-10-26")).toBe(true);
    expect(isArchiveDate("2026-10-01", "2026-10-26")).toBe(true);
    expect(isArchiveDate("2026-10-26", "2026-10-26")).toBe(false);
    expect(isArchiveDate("2026-09-30", "2026-10-26")).toBe(false);
    expect(isArchiveDate("2026-02-30", "2027-01-01")).toBe(false);
    expect(isArchiveDate("gestern", "2026-10-26")).toBe(false);
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
