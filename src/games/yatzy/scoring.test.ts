import { describe, expect, it } from "vitest";

import { calculateScore } from "./scoring";
import { gamemodes } from "./gamemodes";
import type { Points } from "./types";

/**
 * Characterization tests: these pin down what the scoring does *today*, before
 * the code moves to src/games/yatzy. They are expected to survive the move with
 * nothing but their import paths changed.
 */

/** A point sheet with every field of the mode set to 0 (= "not entered"). */
const emptySheet = (gamemode: keyof typeof gamemodes): Points =>
  Object.fromEntries(
    gamemodes[gamemode].fields.map((field) => [field.key, 0]),
  ) as unknown as Points;

const sheet = (
  gamemode: keyof typeof gamemodes,
  values: Record<string, number | "X">,
): Points => ({ ...emptySheet(gamemode), ...values }) as Points;

describe("calculateScore", () => {
  it("scores an empty sheet as 0 in every gamemode", () => {
    for (const gamemode of Object.keys(gamemodes)) {
      expect(calculateScore(emptySheet(gamemode), gamemode)).toBe(0);
    }
  });

  it("sums the entered fields without a bonus below the threshold", () => {
    // Upper section sums to 62 — one short of Wunder's 63.
    const points = sheet("Wunder", {
      Einser: 3,
      Zweier: 8,
      Dreier: 12,
      Vierer: 16,
      Fünfer: 10,
      Sechser: 13,
    });
    expect(calculateScore(points, "Wunder")).toBe(62);
  });

  it("grants the bonus exactly at the threshold", () => {
    const points = sheet("Wunder", {
      Einser: 3,
      Zweier: 8,
      Dreier: 12,
      Vierer: 16,
      Fünfer: 10,
      Sechser: 14,
    });
    // 63 upper + 35 bonus
    expect(calculateScore(points, "Wunder")).toBe(98);
  });

  it("ignores crossed-out (X) fields in both the total and the bonus sum", () => {
    const withX = sheet("Wunder", {
      Einser: "X",
      Zweier: 8,
      Dreier: 12,
      "Full House": 25,
      Wunder: "X",
    });
    expect(calculateScore(withX, "Wunder")).toBe(45);
  });

  it("counts the lower section but never toward the bonus", () => {
    // Upper section is 0, lower section alone must not trigger the bonus.
    const points = sheet("Wunder", {
      "Full House": 25,
      "Kleine Straße": 30,
      "Große Straße": 40,
      Wunder: 50,
      Chance: 20,
    });
    expect(calculateScore(points, "Wunder")).toBe(165);
  });

  it("uses each gamemode's own bonus threshold and amount", () => {
    // MiniWunder: 3 upper fields, min 30, bonus 15.
    const miniBelow = sheet("MiniWunder", { Vierer: 8, Fünfer: 10, Sechser: 11 });
    expect(calculateScore(miniBelow, "MiniWunder")).toBe(29);

    const miniAt = sheet("MiniWunder", { Vierer: 8, Fünfer: 10, Sechser: 12 });
    expect(calculateScore(miniAt, "MiniWunder")).toBe(30 + 15);

    // SuperWunder: min 72, bonus 50.
    const superBelow = sheet("SuperWunder", {
      Einser: 5,
      Zweier: 10,
      Dreier: 15,
      Vierer: 16,
      Fünfer: 15,
      Sechser: 10,
    });
    expect(calculateScore(superBelow, "SuperWunder")).toBe(71);

    const superAt = sheet("SuperWunder", {
      Einser: 5,
      Zweier: 10,
      Dreier: 15,
      Vierer: 16,
      Fünfer: 15,
      Sechser: 12,
    });
    expect(calculateScore(superAt, "SuperWunder")).toBe(73 + 50);
  });

  it("only counts fields that belong to the gamemode", () => {
    // "Full House" does not exist in MiniWunder and must be ignored.
    const points = {
      ...emptySheet("MiniWunder"),
      "Full House": 25,
      "Tiny House": 15,
    } as unknown as Points;
    expect(calculateScore(points, "MiniWunder")).toBe(15);
  });

  it("scores Chaoswunder like Wunder (same fields and bonus)", () => {
    const values = {
      Einser: 4,
      Zweier: 8,
      Dreier: 12,
      Vierer: 16,
      Fünfer: 15,
      Sechser: 18,
      Chance: 22,
    };
    expect(calculateScore(sheet("Chaoswunder", values), "Chaoswunder")).toBe(
      calculateScore(sheet("Wunder", values), "Wunder"),
    );
  });

  it("scores Battle on the Wunder+ field set without doubling", () => {
    // Plain calculateScore knows nothing about Battle's doubled fields —
    // that is battleTotalScore's job.
    const points = sheet("Battle", {
      Einser: 5,
      Zweier: 10,
      Dreier: 15,
      Vierer: 20,
      Fünfer: 25,
      Sechser: 30,
      Wunder: 100,
    });
    expect(calculateScore(points, "Battle")).toBe(105 + 35 + 100);
  });

  it("returns 0 for an unknown gamemode instead of throwing", () => {
    // config?.fields is optional-chained, so the reduce yields undefined + 0.
    expect(
      Number.isNaN(calculateScore(emptySheet("Wunder"), "DoesNotExist")),
    ).toBe(true);
  });
});
