import { describe, expect, it } from "vitest";

import { missionCountFor, missions, selectMissions } from "./chaoswunder";

/** Deterministic stand-in for the shuffle, so the selection can be asserted. */
const noShuffle = <T,>(items: T[]): T[] => [...items];

describe("selectMissions", () => {
  it("draws one mission per rotation slot", () => {
    expect(missionCountFor(2)).toBe(7);
    expect(missionCountFor(1)).toBe(14);
    expect(selectMissions(2, false, noShuffle)).toHaveLength(7);
    expect(selectMissions(1, false, noShuffle)).toHaveLength(14);
  });

  it("keeps the 1/3/3 difficulty mix when balanced with 7 missions", () => {
    const picked = selectMissions(2, true, noShuffle);
    expect(picked).toHaveLength(7);
    const byDifficulty = (d: number) =>
      picked.filter((m) => m.difficulty === d).length;
    expect(byDifficulty(3)).toBe(1);
    expect(byDifficulty(2)).toBe(3);
    expect(byDifficulty(1)).toBe(3);
  });

  it("keeps the 2/6/6 difficulty mix when balanced with 14 missions", () => {
    const picked = selectMissions(1, true, noShuffle);
    expect(picked).toHaveLength(14);
    const byDifficulty = (d: number) =>
      picked.filter((m) => m.difficulty === d).length;
    expect(byDifficulty(3)).toBe(2);
    expect(byDifficulty(2)).toBe(6);
    expect(byDifficulty(1)).toBe(6);
  });

  it("only ever returns real missions", () => {
    for (const mission of selectMissions(1, true, noShuffle)) {
      expect(missions).toContainEqual(mission);
    }
  });

  it("never draws the same mission twice in one game", () => {
    // Several missions share a restriction with a different dice rule, so
    // uniqueness is by entry, not by text.
    const picked = selectMissions(1, false, noShuffle);
    expect(new Set(picked).size).toBe(picked.length);
  });
});
