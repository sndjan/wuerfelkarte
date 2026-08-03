import { describe, expect, it } from "vitest";

import { createGameStorage } from "./storage";
import { MatchPlayer, StoredMatch } from "./types";

type TestGame = { id: string; rounds: number[] };
type TestMatch = StoredMatch<MatchPlayer>;
type TestSettings = { hideScores: boolean; targetScore?: number };

const makeStorage = (reviveGame?: (raw: TestGame) => TestGame | null) =>
  createGameStorage<TestGame, TestMatch, TestSettings>("testgame", {
    defaultSettings: { hideScores: false },
    reviveGame,
  });

const match = (id: string, score = 10): TestMatch => ({
  id,
  players: [{ name: "Anna", score }],
  gamemode: "Standard",
  timestamp: "2026-08-03T12:00:00.000Z",
});

describe("createGameStorage", () => {
  it("namespaces its three keys by the game name", () => {
    const storage = makeStorage();
    expect(storage.gameKey).toBe("testgame:game");
    expect(storage.matchesKey).toBe("testgame:matches");
    expect(storage.settingsKey).toBe("testgame:settings");
  });

  describe("the running game", () => {
    it("round-trips a game", () => {
      const storage = makeStorage();
      const game: TestGame = { id: "g1", rounds: [1, 2, 3] };
      storage.saveGame(game);
      expect(storage.loadGame()).toEqual(game);
    });

    it("returns null when there is nothing stored", () => {
      expect(makeStorage().loadGame()).toBeNull();
    });

    it("returns null instead of throwing on a corrupted payload", () => {
      localStorage.setItem("testgame:game", "{not json");
      expect(makeStorage().loadGame()).toBeNull();
    });

    it("clears the game", () => {
      const storage = makeStorage();
      storage.saveGame({ id: "g1", rounds: [] });
      storage.clearGame();
      expect(storage.loadGame()).toBeNull();
    });

    it("runs a stored game through reviveGame", () => {
      const storage = makeStorage((raw) => ({ ...raw, rounds: [0] }));
      storage.saveGame({ id: "g1", rounds: [] });
      expect(storage.loadGame()).toEqual({ id: "g1", rounds: [0] });
    });

    it("lets reviveGame reject an unusable payload", () => {
      const storage = makeStorage(() => null);
      storage.saveGame({ id: "g1", rounds: [] });
      expect(storage.loadGame()).toBeNull();
    });
  });

  describe("the match history", () => {
    it("starts empty", () => {
      expect(makeStorage().loadMatches()).toEqual([]);
    });

    it("appends new matches in order", () => {
      const storage = makeStorage();
      storage.saveMatch(match("m1"));
      storage.saveMatch(match("m2"));
      expect(storage.loadMatches().map((m) => m.id)).toEqual(["m1", "m2"]);
    });

    it("upserts by id instead of duplicating", () => {
      const storage = makeStorage();
      storage.saveMatch(match("m1", 10));
      storage.saveMatch(match("m2", 20));
      storage.saveMatch(match("m1", 99));

      const matches = storage.loadMatches();
      expect(matches).toHaveLength(2);
      expect(matches[0].players[0].score).toBe(99);
      // The corrected match keeps its position in the history.
      expect(matches.map((m) => m.id)).toEqual(["m1", "m2"]);
    });

    it("removes a match by id", () => {
      const storage = makeStorage();
      storage.saveMatch(match("m1"));
      storage.saveMatch(match("m2"));
      storage.removeMatch("m1");
      expect(storage.loadMatches().map((m) => m.id)).toEqual(["m2"]);
    });

    it("ignores removing a match that is not there", () => {
      const storage = makeStorage();
      storage.saveMatch(match("m1"));
      storage.removeMatch("nope");
      expect(storage.loadMatches()).toHaveLength(1);
    });

    it("recovers from a corrupted or non-array history", () => {
      localStorage.setItem("testgame:matches", JSON.stringify({ not: "an array" }));
      expect(makeStorage().loadMatches()).toEqual([]);

      localStorage.setItem("testgame:matches", "{not json");
      expect(makeStorage().loadMatches()).toEqual([]);
    });
  });

  describe("the settings", () => {
    it("falls back to the defaults when nothing is stored", () => {
      expect(makeStorage().loadSettings()).toEqual({ hideScores: false });
    });

    it("merges a patch into what is already there", () => {
      const storage = makeStorage();
      storage.saveSettings({ hideScores: true });
      storage.saveSettings({ targetScore: 250 });
      expect(storage.loadSettings()).toEqual({ hideScores: true, targetScore: 250 });
    });

    it("keeps the defaults for keys the stored blob does not mention", () => {
      localStorage.setItem("testgame:settings", JSON.stringify({ targetScore: 300 }));
      expect(makeStorage().loadSettings()).toEqual({
        hideScores: false,
        targetScore: 300,
      });
    });
  });

  it("keeps two games' data apart", () => {
    const a = createGameStorage<TestGame, TestMatch, TestSettings>("alpha", {
      defaultSettings: { hideScores: false },
    });
    const b = createGameStorage<TestGame, TestMatch, TestSettings>("beta", {
      defaultSettings: { hideScores: false },
    });

    a.saveMatch(match("m1"));
    expect(b.loadMatches()).toEqual([]);
  });
});
