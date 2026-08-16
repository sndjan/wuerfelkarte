import { describe, expect, it } from "vitest";

import { buildOverallStatsSummary, computeWeeklyStreak } from "./stats";
import { MatchPlayer, StoredMatch } from "./types";

const match = (id: string, timestamp: string, durationMs?: number): StoredMatch<MatchPlayer> => ({
  id,
  gamemode: "standard",
  timestamp,
  durationMs,
  players: [{ name: "Ada", score: 10 }],
});

describe("computeWeeklyStreak", () => {
  const now = new Date(2026, 7, 16); // Sunday, 2026-08-16 — same week as Mon 2026-08-10

  it("is 0 with no matches", () => {
    expect(computeWeeklyStreak([], now)).toBe(0);
  });

  it("counts the current week even if it just started", () => {
    expect(computeWeeklyStreak(["2026-08-16T10:00:00"], now)).toBe(1);
  });

  it("still counts the streak if only last week has a match, since this week isn't over", () => {
    expect(computeWeeklyStreak(["2026-08-09T10:00:00"], now)).toBe(1);
  });

  it("counts consecutive weeks", () => {
    const timestamps = ["2026-08-16T10:00:00", "2026-08-09T10:00:00", "2026-07-30T10:00:00"];
    expect(computeWeeklyStreak(timestamps, now)).toBe(3);
  });

  it("stops at a gap week", () => {
    const timestamps = ["2026-08-16T10:00:00", "2026-07-30T10:00:00"];
    expect(computeWeeklyStreak(timestamps, now)).toBe(1);
  });

  it("is 0 once two weeks have passed without a match", () => {
    expect(computeWeeklyStreak(["2026-07-30T10:00:00"], now)).toBe(0);
  });
});

describe("buildOverallStatsSummary", () => {
  it("sums games, duration, and weekly streak across matches", () => {
    const now = new Date(2026, 7, 16);
    const matches = [
      match("1", "2026-08-16T10:00:00", 60_000),
      match("2", "2026-08-09T10:00:00", 120_000),
    ];
    expect(buildOverallStatsSummary(matches, now)).toEqual({
      gamesPlayed: 2,
      totalDurationMs: 180_000,
      weeklyStreak: 2,
    });
  });

  it("treats matches without a recorded duration as 0", () => {
    const summary = buildOverallStatsSummary([match("1", "2026-08-16T10:00:00")]);
    expect(summary.totalDurationMs).toBe(0);
  });
});
