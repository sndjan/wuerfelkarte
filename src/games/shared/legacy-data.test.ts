import { describe, expect, it } from "vitest";

import { flip7Storage } from "@/games/flip7/storage";
import { wizardStorage } from "@/games/wizard/storage";
import { loadPlayers, yatzyStorage } from "@/games/yatzy/storage";
import {
  LEGACY_STORAGE_SNAPSHOT,
  LEGACY_WIZARD_GAME_WITHOUT_SPECIAL_CARDS,
} from "./legacy-storage.fixtures";
import { migrateLegacyStorage } from "./migrations";
import { loadRoster } from "./roster";

/**
 * End-to-end check for the promise that nobody loses anything on the upgrade:
 * seed a browser with the pre-refactor keys and read everything back through
 * the paths the app actually uses.
 */
const seedLegacyBrowser = () => {
  for (const [key, value] of Object.entries(LEGACY_STORAGE_SNAPSHOT)) {
    localStorage.setItem(key, value);
  }
};

describe("a browser upgrading from the pre-refactor app", () => {
  it("keeps the player roster", () => {
    seedLegacyBrowser();
    const roster = loadRoster();
    expect(roster.map((p) => p.name)).toEqual(["Anna", "Ben", "Cleo"]);
    expect(roster.filter((p) => p.active)).toHaveLength(2);
  });

  it("keeps the Yatzy history, with scores and durations intact", () => {
    seedLegacyBrowser();
    migrateLegacyStorage();

    const matches = yatzyStorage.loadMatches();
    expect(matches).toHaveLength(2);
    expect(matches[0].players.map((p) => p.score)).toEqual([236, 223]);
    expect(matches[0].players[0].emoji).toBe("🦄");
    expect(matches[0].gamemode).toBe("Wunder");
    expect(matches[1].durationMs).toBe(754000);
  });

  it("keeps who was at the Yatzy table", () => {
    seedLegacyBrowser();
    migrateLegacyStorage();
    expect(loadPlayers()).toEqual([{ name: "Anna", emoji: "🦄" }, { name: "Ben" }]);
  });

  it("keeps the Chaoswunder settings", () => {
    seedLegacyBrowser();
    migrateLegacyStorage();
    expect(yatzyStorage.loadSettings()).toEqual({
      missionEveryRound: true,
      balancedMode: false,
      compactMode: false,
    });
  });

  it("keeps the Wizard history and gives every match an id", () => {
    seedLegacyBrowser();
    migrateLegacyStorage();

    const matches = wizardStorage.loadMatches();
    expect(matches).toHaveLength(2);
    expect(matches.every((m) => typeof m.id === "string" && m.id.length > 0)).toBe(
      true,
    );
    expect(matches[0].players[0].exactBids).toBe(8);
    expect(matches[1].gamemode).toBe("25 Jahre Edition");
  });

  it("keeps a Wizard game that was still running", () => {
    seedLegacyBrowser();
    migrateLegacyStorage();

    const game = wizardStorage.loadGame();
    expect(game?.players.map((p) => p.name)).toEqual(["Anna", "Ben", "Cleo"]);
    expect(game?.rounds[0].bids.w1).toBe(1);
    // Games stored before ids existed get one on read.
    expect(typeof game?.id).toBe("string");
  });

  it("keeps a Wizard game saved before Sonderkarten existed", () => {
    localStorage.setItem(
      "wizard:game",
      JSON.stringify(LEGACY_WIZARD_GAME_WITHOUT_SPECIAL_CARDS),
    );
    expect(wizardStorage.loadGame()?.specialCards).toEqual([]);
  });

  it("keeps the Flip 7 history and running game", () => {
    seedLegacyBrowser();
    migrateLegacyStorage();

    const matches = flip7Storage.loadMatches();
    expect(matches).toHaveLength(1);
    expect(matches[0].players[0].flip7s).toBe(2);
    expect(matches[0].targetScore).toBe(200);

    const game = flip7Storage.loadGame();
    expect(game?.players).toHaveLength(3);
    expect(game?.rounds[0].entries.f3.flip7).toBe(true);
  });

  it("keeps the Flip 7 settings, target score included", () => {
    seedLegacyBrowser();
    migrateLegacyStorage();
    expect(flip7Storage.loadSettings()).toEqual({
      hideScores: false,
      targetScore: 250,
    });
  });

  it("leaves a fresh browser completely empty", () => {
    migrateLegacyStorage();
    expect(loadRoster()).toEqual([]);
    expect(yatzyStorage.loadMatches()).toEqual([]);
    expect(wizardStorage.loadMatches()).toEqual([]);
    expect(flip7Storage.loadMatches()).toEqual([]);
    expect(wizardStorage.loadGame()).toBeNull();
    expect(flip7Storage.loadGame()).toBeNull();
  });
});
