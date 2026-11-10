import { describe, expect, it } from "vitest";
import { isSyncedKey, localSyncedKeys } from "./keys";

describe("isSyncedKey", () => {
  it("syncs what a player would miss on another device", () => {
    for (const key of [
      "wuerfelkarte:roster",
      "yatzy:game",
      "wizard:matches",
      "darts:settings",
      "yatzy:players",
      "quiz:days",
      "speedrun:daily",
    ]) {
      expect(isSyncedKey(key), key).toBe(true);
    }
  });

  it("keeps device-only state out", () => {
    for (const key of [
      "quiz:submission",
      "speedrun:submission",
      "wuerfelkarte:schema",
      "wuerfelkarte:themeActive",
      "wuerfelkarte:sync",
      "kniffel:roster",
      "sb-abc-auth-token",
    ]) {
      expect(isSyncedKey(key), key).toBe(false);
    }
  });
});

describe("localSyncedKeys", () => {
  it("lists only synced keys", () => {
    localStorage.setItem("yatzy:matches", "[]");
    localStorage.setItem("quiz:submission", "{}");
    expect(localSyncedKeys()).toEqual(["yatzy:matches"]);
  });
});
