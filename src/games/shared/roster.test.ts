import { describe, expect, it } from "vitest";

import { ROSTER_KEY } from "./migrations";
import {
  activateRosterPlayerByName,
  activePlayers,
  createRosterPlayer,
  loadRoster,
  nextSelectionOrder,
  saveRoster,
  syncRosterOrder,
  updateRosterPlayerByName,
} from "./roster";
import { LEGACY_ROSTER, LEGACY_ROSTER_WITHOUT_ORDER } from "./legacy-storage.fixtures";
import { RosterPlayer } from "./types";

const seed = (roster: unknown) =>
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));

const player = (
  id: string,
  name: string,
  active = true,
  selectionOrder: number | null = 1,
): RosterPlayer => ({ id, name, emoji: "🦄", active, selectionOrder });

describe("loadRoster", () => {
  it("returns an empty roster on a fresh browser", () => {
    expect(loadRoster()).toEqual([]);
  });

  it("reads what was saved", () => {
    seed(LEGACY_ROSTER);
    expect(loadRoster()).toEqual(LEGACY_ROSTER);
  });

  it("backfills a selection order for active players that lack one", () => {
    seed(LEGACY_ROSTER_WITHOUT_ORDER);
    const roster = loadRoster();
    expect(roster[0].selectionOrder).toBe(1);
    // Inactive players stay without an order.
    expect(roster[1].selectionOrder).toBeUndefined();
  });

  it("recovers from a corrupted payload", () => {
    localStorage.setItem(ROSTER_KEY, "{not json");
    expect(loadRoster()).toEqual([]);
  });

  it("migrates the legacy roster key before reading", () => {
    localStorage.setItem("kniffel:roster", JSON.stringify(LEGACY_ROSTER));
    expect(loadRoster()).toEqual(LEGACY_ROSTER);
  });
});

describe("selection order", () => {
  it("hands out the next free order number", () => {
    expect(nextSelectionOrder([])).toBe(1);
    expect(nextSelectionOrder([player("a", "Anna", true, 3)])).toBe(4);
    // Inactive players (null order) do not hold a slot.
    expect(nextSelectionOrder([player("a", "Anna", false, null)])).toBe(1);
  });

  it("creates a new player as active at the end of the order", () => {
    const roster = [player("a", "Anna", true, 1)];
    const created = createRosterPlayer("Ben", "🐸", roster);
    expect(created.active).toBe(true);
    expect(created.selectionOrder).toBe(2);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("lists active players in selection order", () => {
    const roster = [
      player("a", "Anna", true, 3),
      player("b", "Ben", false, null),
      player("c", "Cleo", true, 1),
    ];
    expect(activePlayers(roster).map((p) => p.name)).toEqual(["Cleo", "Anna"]);
  });
});

describe("activateRosterPlayerByName", () => {
  it("activates a matching inactive player and puts them last", () => {
    saveRoster([player("a", "Anna", true, 1), player("b", "Ben", false, null)]);
    activateRosterPlayerByName("Ben");

    const ben = loadRoster().find((p) => p.name === "Ben");
    expect(ben?.active).toBe(true);
    expect(ben?.selectionOrder).toBe(2);
  });

  it("matches case-insensitively and ignores surrounding spaces", () => {
    saveRoster([player("b", "Ben", false, null)]);
    activateRosterPlayerByName("  bEn ");
    expect(loadRoster()[0].active).toBe(true);
  });

  it("leaves an already active player alone", () => {
    saveRoster([player("b", "Ben", true, 5)]);
    activateRosterPlayerByName("Ben");
    expect(loadRoster()[0].selectionOrder).toBe(5);
  });

  it("does nothing for an unknown name", () => {
    saveRoster([player("b", "Ben", false, null)]);
    activateRosterPlayerByName("Nobody");
    expect(loadRoster()[0].active).toBe(false);
  });
});

describe("updateRosterPlayerByName", () => {
  it("renames and re-emojis the matching player", () => {
    saveRoster([player("a", "Anna", true, 1)]);
    updateRosterPlayerByName("Anna", "Annika", "🐼");

    const [updated] = loadRoster();
    expect(updated.name).toBe("Annika");
    expect(updated.emoji).toBe("🐼");
  });

  it("keeps the current emoji when none is given", () => {
    saveRoster([player("a", "Anna", true, 1)]);
    updateRosterPlayerByName("Anna", "Annika");
    expect(loadRoster()[0].emoji).toBe("🦄");
  });

  it("does nothing for an unknown name", () => {
    saveRoster([player("a", "Anna", true, 1)]);
    updateRosterPlayerByName("Nobody", "X");
    expect(loadRoster()[0].name).toBe("Anna");
  });
});

describe("syncRosterOrder", () => {
  it("adopts the in-game order for the players that played", () => {
    saveRoster([
      player("a", "Anna", true, 1),
      player("b", "Ben", true, 2),
      player("c", "Cleo", true, 3),
    ]);

    syncRosterOrder(["Cleo", "Anna", "Ben"]);

    const byName = Object.fromEntries(
      loadRoster().map((p) => [p.name, p.selectionOrder]),
    );
    expect(byName).toEqual({ Cleo: 1, Anna: 2, Ben: 3 });
  });

  it("parks active players who were not in the game behind the ones who were", () => {
    saveRoster([
      player("a", "Anna", true, 1),
      player("b", "Ben", true, 2),
      player("c", "Cleo", true, 3),
    ]);

    syncRosterOrder(["Cleo"]);

    const byName = Object.fromEntries(
      loadRoster().map((p) => [p.name, p.selectionOrder]),
    );
    expect(byName.Cleo).toBe(1);
    // Anna and Ben keep their relative order behind Cleo.
    expect(byName.Anna).toBe(2);
    expect(byName.Ben).toBe(3);
  });

  it("leaves inactive players untouched", () => {
    saveRoster([player("a", "Anna", true, 1), player("z", "Zoe", false, null)]);
    syncRosterOrder(["Anna"]);
    expect(loadRoster().find((p) => p.name === "Zoe")?.selectionOrder).toBeNull();
  });

  it("does nothing on an empty roster", () => {
    syncRosterOrder(["Anna"]);
    expect(loadRoster()).toEqual([]);
  });
});
