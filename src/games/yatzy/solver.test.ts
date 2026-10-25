import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import {
  CATEGORIES,
  createSolver,
  scoreCategory,
  SOLVER_TABLE_PATH,
  solverFromTable,
  tournamentRules,
  type Category,
  type Solver,
} from "./solver";

/** A state where only the given fields are still open. */
const onlyOpen = (...open: Category[]) => ({
  filled: CATEGORIES.filter((c) => !open.includes(c)),
  upperSum: 0,
});

/** Same, with the Wunder field holding 50. */
const onlyOpenAfterWunder = (...open: Category[]) => ({
  ...onlyOpen(...open),
  wunderScored: true,
});

describe("scoreCategory", () => {
  it("scores the upper section as the sum of matching dice", () => {
    expect(scoreCategory([3, 3, 3, 5, 6], "Dreier")).toBe(9);
    expect(scoreCategory([3, 3, 3, 5, 6], "Sechser")).toBe(6);
    expect(scoreCategory([3, 3, 3, 5, 6], "Einser")).toBe(0);
  });

  it("scores Pasch fields as the dice total", () => {
    expect(scoreCategory([4, 4, 4, 2, 1], "Dreierpasch")).toBe(15);
    expect(scoreCategory([4, 4, 4, 2, 1], "Viererpasch")).toBe(0);
    expect(scoreCategory([4, 4, 4, 4, 1], "Viererpasch")).toBe(17);
  });

  it("scores Full House only for three plus two by default", () => {
    expect(scoreCategory([2, 2, 5, 5, 5], "Full House")).toBe(25);
    expect(scoreCategory([5, 5, 5, 5, 5], "Full House")).toBe(0);
    expect(
      scoreCategory([5, 5, 5, 5, 5], "Full House", {
        ...tournamentRules,
        wunderCountsAsFullHouse: true,
      }),
    ).toBe(25);
  });

  it("scores straights", () => {
    expect(scoreCategory([1, 2, 3, 4, 6], "Kleine Straße")).toBe(30);
    expect(scoreCategory([3, 4, 5, 6, 3], "Kleine Straße")).toBe(30);
    expect(scoreCategory([1, 2, 3, 5, 6], "Kleine Straße")).toBe(0);
    expect(scoreCategory([2, 3, 4, 5, 6], "Große Straße")).toBe(40);
    expect(scoreCategory([1, 2, 3, 4, 6], "Große Straße")).toBe(0);
  });

  it("scores Wunder and Chance", () => {
    expect(scoreCategory([6, 6, 6, 6, 6], "Wunder")).toBe(50);
    expect(scoreCategory([6, 6, 6, 6, 5], "Wunder")).toBe(0);
    expect(scoreCategory([6, 6, 6, 6, 5], "Chance")).toBe(29);
  });
});

describe("createSolver", () => {
  let solver: Solver;
  beforeAll(() => {
    solver = createSolver();
  }, 120_000);

  it("values a lone Wunder field at 50 × P(five of a kind in three rolls)", () => {
    // P = 2,783,176 / 6^10 for the optimal "keep the largest group" play.
    expect(solver.expectedScore(onlyOpen("Wunder"))).toBeCloseTo(
      (50 * 2_783_176) / 6 ** 10,
      9,
    );
  });

  it("keeps the triple when chasing a Wunder", () => {
    const [best] = solver.analyze(onlyOpen("Wunder"), [1, 2, 3, 3, 3], 2);
    expect(best).toMatchObject({ kind: "keep", dice: [3, 3, 3] });
  });

  it("picks the field with the highest expected total on the last roll", () => {
    const options = solver.analyze(onlyOpen("Chance", "Sechser"), [6, 6, 6, 6, 2], 0);
    expect(options.map((o) => o.kind === "score" && o.category)).toEqual([
      "Sechser",
      "Chance",
    ]);
    expect(options[0]).toMatchObject({ points: 24 });
  });

  it("pays the upper bonus when a field reaches the threshold", () => {
    const state = { ...onlyOpen("Sechser"), upperSum: 45 };
    const [best] = solver.analyze(state, [6, 6, 6, 1, 2], 0);
    expect(best.expected).toBe(18 + 35);
  });

  it("gives an extra Wunder 50 bonus points and enters it in a matching field", () => {
    const options = solver.analyze(
      onlyOpenAfterWunder("Full House", "Kleine Straße", "Chance"),
      [4, 4, 4, 4, 4],
      0,
    );
    // Full House and the straights are not allowed while Chance is free.
    expect(options).toEqual([
      expect.objectContaining({ category: "Chance", points: 20, bonus: 50 }),
    ]);
  });

  it("crosses out a field when an extra Wunder fits nowhere, keeping the bonus", () => {
    const options = solver.analyze(
      onlyOpenAfterWunder("Full House", "Große Straße"),
      [6, 6, 6, 6, 6],
      0,
    );
    expect(options.map((o) => o.kind === "score" && [o.category, o.points, o.bonus])).toEqual(
      expect.arrayContaining([
        ["Full House", 0, 50],
        ["Große Straße", 0, 50],
      ]),
    );
  });

  it("counts an extra Wunder towards the upper bonus", () => {
    const state = { ...onlyOpenAfterWunder("Fünfer"), upperSum: 40 };
    const [best] = solver.analyze(state, [5, 5, 5, 5, 5], 0);
    expect(best).toMatchObject({ category: "Fünfer", points: 25, bonus: 50 + 35 });
  });

  it("gives no bonus for a Wunder after the Wunder field was crossed out", () => {
    const [best] = solver.analyze(onlyOpen("Full House", "Chance"), [3, 3, 3, 3, 3], 0);
    expect(best).toMatchObject({ category: "Chance", points: 15, bonus: 0 });
    expect(solver.analyze(onlyOpen("Full House"), [3, 3, 3, 3, 3], 0)).toEqual([
      expect.objectContaining({ category: "Full House", points: 0, bonus: 0 }),
    ]);
  });

  it("values a scored Wunder field by the chance of more Wunders", () => {
    const crossedOut = solver.expectedScore(onlyOpen("Chance"));
    const scored = solver.expectedScore(onlyOpenAfterWunder("Chance"));
    expect(scored).toBeGreaterThan(crossedOut);
    expect(scored - crossedOut).toBeLessThan(50 * 0.05);
  });

  it("ships a table in public/ that matches a fresh computation", () => {
    // If this fails, the solver or its rules changed: npm run build:solver-table
    const shipped = readFileSync(`public${SOLVER_TABLE_PATH}`);
    expect(Buffer.from(solver.serialize()).equals(shipped)).toBe(true);
  });

  it("answers the same from a loaded table", () => {
    const loaded = solverFromTable(solver.serialize());
    const empty = { filled: [], upperSum: 0 };
    expect(loaded.expectedScore(empty)).toBeCloseTo(solver.expectedScore(empty), 3);
    for (const dice of [
      [1, 2, 3, 3, 3],
      [6, 6, 6, 6, 1],
      [2, 3, 4, 5, 5],
    ]) {
      const fresh = solver.analyze(empty, dice, 2);
      const fromTable = loaded.analyze(empty, dice, 2);
      expect(fromTable[0]).toEqual({ ...fresh[0], expected: expect.closeTo(fresh[0].expected, 3) });
    }
  });

  it("rejects a table built for other rules", () => {
    expect(() =>
      solverFromTable(solver.serialize(), { ...tournamentRules, extraWunderBonus: 0 }),
    ).toThrow(/states/);
  });

  it("matches Holderied's reference expectation of 245.9 for an empty card", () => {
    const holderied = createSolver({
      ...tournamentRules,
      wunderCountsAsFullHouse: true,
      extraWunderBonus: 0,
    });
    const expected = holderied.expectedScore({ filled: [], upperSum: 0 });
    expect(Math.abs(expected - 245.9)).toBeLessThan(0.05);
  }, 120_000);
});
