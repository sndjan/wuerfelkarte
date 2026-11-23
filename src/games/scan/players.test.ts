import { describe, expect, it } from "vitest";

import type { RosterPlayer } from "@/games/shared/types";
import { matchNames, normalizeName, seatRoster } from "./players";

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
