import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA,
  ROSTER_KEY,
  SCHEMA_KEY,
  THEME_ACTIVE_KEY,
  migrateLegacyStorage,
} from "./migrations";
import {
  LEGACY_CHAOS_SETTINGS,
  LEGACY_FLIP7_MATCHES,
  LEGACY_PLAYER_NAMES_OBJECTS,
  LEGACY_ROSTER,
  LEGACY_STORAGE_SNAPSHOT,
  LEGACY_WIZARD_MATCHES,
  LEGACY_YATZY_MATCHES,
} from "./legacy-storage.fixtures";

const seedLegacy = (keys: Record<string, string> = LEGACY_STORAGE_SNAPSHOT) => {
  for (const [key, value] of Object.entries(keys)) {
    localStorage.setItem(key, value);
  }
};

const read = <T>(key: string): T => JSON.parse(localStorage.getItem(key) ?? "null");

describe("migrateLegacyStorage", () => {
  it("carries the roster over verbatim", () => {
    seedLegacy();
    migrateLegacyStorage();
    expect(read(ROSTER_KEY)).toEqual(LEGACY_ROSTER);
  });

  it("carries the seasonal theme setting over", () => {
    seedLegacy();
    migrateLegacyStorage();
    expect(read(THEME_ACTIVE_KEY)).toBe(true);
  });

  it("carries the Yatzy player names over verbatim", () => {
    seedLegacy();
    migrateLegacyStorage();
    expect(read("yatzy:players")).toEqual(LEGACY_PLAYER_NAMES_OBJECTS);
  });

  it("reshapes the Yatzy history, dropping the point sheets and adding ids", () => {
    seedLegacy();
    migrateLegacyStorage();

    const matches = read<
      Array<{
        id: string;
        players: Array<{ name: string; emoji?: string; score: number }>;
        gamemode: string;
        timestamp: string;
        durationMs?: number;
      }>
    >("yatzy:matches");

    expect(matches).toHaveLength(2);

    expect(matches[0].players).toEqual([
      { name: "Anna", emoji: "🦄", score: 236 },
      { name: "Ben", score: 223 },
    ]);
    expect(matches[0].gamemode).toBe("Wunder");
    expect(matches[0].timestamp).toBe(LEGACY_YATZY_MATCHES[0].timestamp);
    expect(matches[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(matches[0]).not.toHaveProperty("durationMs");

    // The duration the timer feature added survives.
    expect(matches[1].durationMs).toBe(754000);
  });

  it("gives the Wizard history the ids it never had, keeping everything else", () => {
    seedLegacy();
    migrateLegacyStorage();

    const matches = read<Array<Record<string, unknown>>>("wizard:matches");
    expect(matches).toHaveLength(2);
    expect(matches[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(matches[0].players).toEqual(LEGACY_WIZARD_MATCHES[0].players);
    expect(matches[0].plusMinusOne).toBe(false);
    expect(matches[0].durationMs).toBe(3_120_000);
    expect(matches[1].specialCards).toEqual(["drache", "fee", "bombe"]);
  });

  it("carries the Flip 7 history over verbatim, ids included", () => {
    seedLegacy();
    migrateLegacyStorage();
    expect(read("flip7:matches")).toEqual(LEGACY_FLIP7_MATCHES);
  });

  it("folds the Chaoswunder toggles into the Yatzy settings", () => {
    seedLegacy();
    migrateLegacyStorage();
    expect(read("yatzy:settings")).toEqual(LEGACY_CHAOS_SETTINGS);
  });

  it("leaves the old keys in place so a rollback still finds them", () => {
    seedLegacy();
    migrateLegacyStorage();
    for (const key of Object.keys(LEGACY_STORAGE_SNAPSHOT)) {
      expect(localStorage.getItem(key)).not.toBeNull();
    }
  });

  it("marks the schema so it does not run twice", () => {
    seedLegacy();
    migrateLegacyStorage();
    expect(localStorage.getItem(SCHEMA_KEY)).toBe(String(CURRENT_SCHEMA));
  });

  it("is idempotent — a second run changes nothing", () => {
    seedLegacy();
    migrateLegacyStorage();
    const afterFirst = read("yatzy:matches");

    migrateLegacyStorage();
    expect(read("yatzy:matches")).toEqual(afterFirst);
  });

  it("never overwrites data the new code already wrote", () => {
    seedLegacy();
    const mine = [{ id: "keep-me", players: [], gamemode: "Wunder", timestamp: "x" }];
    localStorage.setItem("yatzy:matches", JSON.stringify(mine));
    localStorage.setItem(ROSTER_KEY, JSON.stringify([]));

    migrateLegacyStorage();

    expect(read("yatzy:matches")).toEqual(mine);
    expect(read(ROSTER_KEY)).toEqual([]);
  });

  it("migrates the remaining keys when one payload is malformed", () => {
    seedLegacy();
    localStorage.setItem("lastMatches", "{definitely not json");

    migrateLegacyStorage();

    expect(localStorage.getItem("yatzy:matches")).toBeNull();
    // The unrelated keys still came across.
    expect(read(ROSTER_KEY)).toEqual(LEGACY_ROSTER);
    expect(read("flip7:matches")).toEqual(LEGACY_FLIP7_MATCHES);
    expect(localStorage.getItem(SCHEMA_KEY)).toBe(String(CURRENT_SCHEMA));
  });

  it("does nothing at all on a fresh browser", () => {
    migrateLegacyStorage();
    expect(localStorage.getItem("yatzy:matches")).toBeNull();
    expect(localStorage.getItem(ROSTER_KEY)).toBeNull();
    expect(localStorage.getItem(SCHEMA_KEY)).toBe(String(CURRENT_SCHEMA));
  });

  it("skips entirely once the schema marker is set", () => {
    localStorage.setItem(SCHEMA_KEY, String(CURRENT_SCHEMA));
    seedLegacy();

    migrateLegacyStorage();

    expect(localStorage.getItem(ROSTER_KEY)).toBeNull();
  });

  it("handles a history entry whose players array is missing", () => {
    localStorage.setItem(
      "lastMatches",
      JSON.stringify([{ gamemode: "Wunder", timestamp: "2026-01-01T00:00:00.000Z" }]),
    );

    migrateLegacyStorage();

    expect(read("yatzy:matches")).toEqual([]);
  });

  it("defaults a match with missing fields instead of dropping it", () => {
    localStorage.setItem(
      "lastMatches",
      JSON.stringify([{ players: [{ name: "Anna" }, {}] }]),
    );

    migrateLegacyStorage();

    const matches = read<Array<{ players: unknown[]; gamemode: string }>>(
      "yatzy:matches",
    );
    expect(matches[0].players).toEqual([
      { name: "Anna", score: 0 },
      { name: "?", score: 0 },
    ]);
    expect(matches[0].gamemode).toBe("Wunder");
  });
});
