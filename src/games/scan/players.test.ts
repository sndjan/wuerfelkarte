import { describe, expect, it } from "vitest";

import type { RosterPlayer } from "@/games/shared/types";
import { guestNames, matchNames, normalizeName, seatColumns, seatRoster } from "./players";

const player = (id: string, name: string, extra: Partial<RosterPlayer> = {}): RosterPlayer => ({
  id,
  name,
  emoji: "🦊",
  active: false,
  selectionOrder: null,
  ...extra,
});

const roster = [
  player("jan", "Jan"),
  player("lena", "Lena"),
  player("joh", "Johanna"),
  player("tim", "Tim", { formerNames: ["Timmi"] }),
  player("ben", "Ben"),
  player("bea", "Bea"),
];

describe("matchNames", () => {
  it("matches exact names regardless of case and accents", () => {
    expect(normalizeName(" Léna! ")).toBe("lena");
    expect(matchNames(["jan", "LENA"], roster)).toEqual(["jan", "lena"]);
  });

  it("forgives a slip in the handwriting", () => {
    expect(matchNames(["Jna", "Johana"], roster)).toEqual(["jan", "joh"]);
  });

  it("knows former names and short forms", () => {
    expect(matchNames(["Timmi", "Jo"], roster)).toEqual(["tim", "joh"]);
  });

  it("leaves empty, unknown and ambiguous names open", () => {
    // "Be" is one step from both Ben and Bea.
    expect(matchNames(["", "Xaver", "Be"], roster)).toEqual([null, null, null]);
  });

  it("gives every roster player to one column at most", () => {
    expect(matchNames(["Jan", "Jan"], roster)).toEqual(["jan", null]);
  });
});

describe("seatRoster", () => {
  it("selects exactly the seated players in seating order", () => {
    const seated = seatRoster(
      [player("a", "Anna", { active: true, selectionOrder: 1 }), player("b", "Ben"), player("c", "Cleo")],
      ["Cleo", "anna"],
    );
    expect(seated.map((p) => [p.name, p.active, p.selectionOrder])).toEqual([
      ["Anna", true, 2],
      ["Ben", false, null],
      ["Cleo", true, 1],
    ]);
  });
});

describe("seatColumns", () => {
  const col = (column: number, name = "") => ({ column, name });

  it("gives unnamed columns the lobby's players in seating order", () => {
    const list = [
      player("a", "Anna", { active: true, selectionOrder: 2 }),
      player("b", "Ben", { active: true, selectionOrder: 1 }),
      player("c", "Cleo"),
    ];
    expect(seatColumns([col(1), col(2)], list)).toEqual([
      { kind: "roster", id: "b" },
      { kind: "roster", id: "a" },
    ]);
  });

  it("skips lobby players already named on the sheet", () => {
    const list = [
      player("a", "Anna", { active: true, selectionOrder: 1 }),
      player("b", "Ben", { active: true, selectionOrder: 2 }),
    ];
    expect(seatColumns([col(1), col(2, "Anna")], list)).toEqual([
      { kind: "roster", id: "b" },
      { kind: "roster", id: "a" },
    ]);
  });

  it("calls the rest Spieler <column>, reusing such a player from an earlier scan", () => {
    const list = [player("s1", "Spieler 1")];
    expect(seatColumns([col(1), col(3), col(4, "Xaver")], list)).toEqual([
      { kind: "roster", id: "s1" },
      { kind: "new", name: "Spieler 3" },
      { kind: "new", name: "Xaver" },
    ]);
  });
});

describe("guestNames", () => {
  it("names one guest Gast and several Gast 1, Gast 2", () => {
    expect(guestNames([{ kind: "anon" }, null])).toEqual(["Gast", null]);
    expect(guestNames([{ kind: "anon" }, { kind: "roster", id: "a" }, { kind: "anon" }])).toEqual(["Gast 1", null, "Gast 2"]);
  });
});
