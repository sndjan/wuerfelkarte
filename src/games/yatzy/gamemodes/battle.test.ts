import { describe, expect, it } from "vitest";

import {
  battleTotalScore,
  battleUpperSum,
  getBattleFieldStatus,
  getOpenForcedFields,
  isForcedSuccess,
} from "./battle";
import { gamemodes } from "./index";
import type { Player, Points } from "../types";

/**
 * Characterization tests for Battle mode. Battle is the most stateful part of
 * Yatzy and has no coverage today — these pin its rules before the code moves.
 *
 * Battle uses the Wunder+ field set: upper section bonus at 63 for 35 points.
 */

const config = gamemodes.Battle;

const player = (
  id: number,
  points: Record<string, number | "X"> = {},
): Player => ({
  id,
  name: `P${id}`,
  points: points as unknown as Points,
  score: 0,
});

describe("getBattleFieldStatus", () => {
  it("reports open when nobody has touched the field", () => {
    const players = [player(1), player(2)];
    expect(getBattleFieldStatus(players, "Einser", 1)).toBe("open");
  });

  it("reports blocked when another player scored the field", () => {
    const players = [player(1), player(2, { Einser: 4 })];
    expect(getBattleFieldStatus(players, "Einser", 1)).toBe("blocked");
  });

  it("reports forced when another player crossed the field out", () => {
    const players = [player(1), player(2, { Einser: "X" })];
    expect(getBattleFieldStatus(players, "Einser", 1)).toBe("forced");
  });

  it("prefers blocked over forced when both happened", () => {
    const players = [player(1), player(2, { Einser: "X" }), player(3, { Einser: 4 })];
    expect(getBattleFieldStatus(players, "Einser", 1)).toBe("blocked");
  });

  it("reports open once the player resolved the field themselves", () => {
    // Own cell keeps its own styling, no overlay — with a number …
    const scored = [player(1, { Einser: 3 }), player(2, { Einser: "X" })];
    expect(getBattleFieldStatus(scored, "Einser", 1)).toBe("open");
    // … and with a cross.
    const crossed = [player(1, { Einser: "X" }), player(2, { Einser: 4 })];
    expect(getBattleFieldStatus(crossed, "Einser", 1)).toBe("open");
  });

  it("treats 0 as untouched, not as a scored field", () => {
    const players = [player(1), player(2, { Einser: 0 })];
    expect(getBattleFieldStatus(players, "Einser", 1)).toBe("open");
  });
});

describe("isForcedSuccess", () => {
  it("is true when someone crossed the field and nobody claimed it", () => {
    const players = [player(1), player(2, { Einser: "X" })];
    expect(isForcedSuccess(players, "Einser", 1)).toBe(true);
  });

  it("is false once another player claimed the field", () => {
    const players = [player(1), player(2, { Einser: "X" }), player(3, { Einser: 4 })];
    expect(isForcedSuccess(players, "Einser", 1)).toBe(false);
  });

  it("is false when nobody touched the field", () => {
    expect(isForcedSuccess([player(1), player(2)], "Einser", 1)).toBe(false);
  });

  it("ignores the player's own cross", () => {
    const players = [player(1, { Einser: "X" }), player(2)];
    expect(isForcedSuccess(players, "Einser", 1)).toBe(false);
  });
});

describe("getOpenForcedFields", () => {
  it("lists fields that are crossed, unclaimed and still open for someone", () => {
    const players = [player(1), player(2, { Einser: "X" })];
    expect(getOpenForcedFields(players, config).map((f) => f.key)).toEqual([
      "Einser",
    ]);
  });

  it("drops a field once somebody claimed it", () => {
    const players = [player(1, { Einser: 4 }), player(2, { Einser: "X" })];
    expect(getOpenForcedFields(players, config)).toEqual([]);
  });

  it("drops a field once everybody resolved it", () => {
    const players = [player(1, { Einser: "X" }), player(2, { Einser: "X" })];
    expect(getOpenForcedFields(players, config)).toEqual([]);
  });
});

describe("battleUpperSum", () => {
  it("sums the upper section and doubles the flagged fields", () => {
    const points = { Einser: 3, Zweier: 8, Dreier: 12 };
    expect(battleUpperSum(points, new Set(), config)).toBe(23);
    expect(battleUpperSum(points, new Set(["Zweier"]), config)).toBe(31);
  });

  it("ignores doubled lower-section fields", () => {
    const points = { Einser: 3, "Full House": 25 };
    expect(battleUpperSum(points, new Set(["Full House"]), config)).toBe(3);
  });
});

describe("battleTotalScore", () => {
  it("sums every numeric field, ignoring crosses", () => {
    const points: Record<string, number | "X"> = {
      Einser: 3,
      Zweier: "X",
      "Full House": 25,
    };
    expect(battleTotalScore(points, new Set(), config)).toBe(28);
  });

  it("doubles flagged fields in the total", () => {
    const points = { "Kleine Straße": 30 };
    expect(battleTotalScore(points, new Set(["Kleine Straße"]), config)).toBe(60);
  });

  it("counts doubled upper fields toward the bonus threshold", () => {
    // Raw upper sum is 55 — no bonus …
    const points = {
      Einser: 5,
      Zweier: 10,
      Dreier: 15,
      Vierer: 8,
      Fünfer: 10,
      Sechser: 7,
    };
    expect(battleTotalScore(points, new Set(), config)).toBe(55);

    // … but doubling Dreier lifts it to 70, which clears 63 and pays 35.
    expect(battleTotalScore(points, new Set(["Dreier"]), config)).toBe(70 + 35);
  });

  it("grants the bonus exactly at the threshold", () => {
    const points = {
      Einser: 3,
      Zweier: 8,
      Dreier: 12,
      Vierer: 16,
      Fünfer: 10,
      Sechser: 14,
    };
    expect(battleTotalScore(points, new Set(), config)).toBe(63 + 35);
  });

  it("scores an empty sheet as 0", () => {
    expect(battleTotalScore({}, new Set(), config)).toBe(0);
  });
});
