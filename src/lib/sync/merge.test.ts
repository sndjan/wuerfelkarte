import { describe, expect, it } from "vitest";
import { mergeValues, unionById } from "./merge";

describe("unionById", () => {
  it("keeps local entries and adds remote ones it lacks", () => {
    expect(unionById([{ id: "a", v: 1 }], [{ id: "a", v: 2 }, { id: "b", v: 3 }])).toEqual([
      { id: "a", v: 1 },
      { id: "b", v: 3 },
    ]);
  });

  it("treats the same name as the same player when asked", () => {
    const local = [{ id: "1", name: "Anna" }];
    const remote = [{ id: "2", name: " anna " }, { id: "3", name: "Ben" }];
    expect(unionById(local, remote, true).map((p) => p.id)).toEqual(["1", "3"]);
    expect(unionById(local, remote).map((p) => p.id)).toEqual(["1", "2", "3"]);
  });
});

describe("mergeValues", () => {
  it("combines match histories in time order", () => {
    const local = [{ id: "b", timestamp: "2026-01-02T00:00:00Z" }];
    const remote = [
      { id: "a", timestamp: "2026-01-01T00:00:00Z" },
      { id: "c", timestamp: "2026-01-03T00:00:00Z" },
    ];
    expect((mergeValues("yatzy:matches", local, remote) as { id: string }[]).map((m) => m.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("combines the roster without duplicate names", () => {
    const merged = mergeValues(
      "wuerfelkarte:roster",
      [{ id: "1", name: "Anna" }],
      [{ id: "2", name: "Anna" }, { id: "3", name: "Ben" }],
    );
    expect(merged).toEqual([{ id: "1", name: "Anna" }, { id: "3", name: "Ben" }]);
  });

  it("combines quiz days, preferring this device's", () => {
    expect(mergeValues("quiz:days", { d2: "local" }, { d1: "remote", d2: "remote" })).toEqual({
      d1: "remote",
      d2: "local",
    });
  });

  it("keeps this device's running game and settings", () => {
    expect(mergeValues("wizard:game", { round: 3 }, { round: 5 })).toEqual({ round: 3 });
    expect(mergeValues("yatzy:settings", { compactMode: true }, { compactMode: false })).toEqual({
      compactMode: true,
    });
  });

  it("takes the other side when one is missing or malformed", () => {
    expect(mergeValues("flip7:matches", null, [{ id: "a" }])).toEqual([{ id: "a" }]);
    expect(mergeValues("flip7:matches", [{ id: "a" }], null)).toEqual([{ id: "a" }]);
  });
});
