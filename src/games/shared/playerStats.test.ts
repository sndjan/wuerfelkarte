import { describe, expect, it } from "vitest";

import { formatRate, headToHead, knownPlayers, playerSummary } from "./playerStats";
import type { StoredMatch } from "./types";

const match = (timestamp: string, scores: Record<string, number>, emoji: Record<string, string> = {}): StoredMatch => ({
  id: timestamp,
  gamemode: "Wunder",
  timestamp,
  players: Object.entries(scores).map(([name, score]) => ({ name, score, ...(emoji[name] ? { emoji: emoji[name] } : {}) })),
});

const history = [
  match("2026-11-01T10:00:00Z", { Jan: 200, Lena: 250 }),
  match("2026-11-02T10:00:00Z", { Jan: 280, Lena: 210, Tom: 280 }, { Jan: "🦊" }),
  match("2026-11-03T10:00:00Z", { Jan: 190 }),
];

describe("knownPlayers", () => {
  it("lists everyone, most games first, with their newest character", () => {
    expect(knownPlayers(history)).toEqual([
      { name: "Jan", emoji: "🦊", games: 3 },
      { name: "Lena", games: 2 },
      { name: "Tom", games: 1 },
    ]);
  });
});

describe("playerSummary", () => {
  it("counts wins only in games with others, ties as wins", () => {
    const jan = playerSummary("jan", history);
    expect(jan).toMatchObject({ games: 3, wins: 1, contested: 2, highscore: 280, average: 223 });
    expect(jan.recent).toEqual([200, 280, 190]);
    expect(formatRate(jan)).toBe("50 %");
  });

  it("takes the lowest score as best where lower wins", () => {
    expect(playerSummary("Lena", history, true)).toMatchObject({ wins: 1, highscore: 210 });
  });

  it("has no numbers for a player without games", () => {
    const nobody = playerSummary("Mia", history);
    expect(nobody).toMatchObject({ games: 0, highscore: null, average: null, recent: [] });
    expect(formatRate(nobody)).toBe("–");
  });
});

describe("headToHead", () => {
  it("compares two players only where both played", () => {
    expect(headToHead("Jan", "Lena", history)).toEqual({ wins: 1, losses: 1 });
    expect(headToHead("Jan", "Tom", history)).toEqual({ wins: 0, losses: 0 });
  });
});
