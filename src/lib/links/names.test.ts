import { describe, expect, it } from "vitest";
import type { RosterPlayer } from "@/games/shared/types";
import { accountRenames, renameIn } from "./names";
import type { PlayerLink, Profile } from "./share";

const JAN = "jan-id";
const TIM = "tim-id";

const player = (id: string, name: string, extra: Partial<RosterPlayer> = {}): RosterPlayer => ({
  id,
  name,
  emoji: "🐸",
  active: true,
  selectionOrder: 1,
  ...extra,
});

const link = (status: PlayerLink["status"] = "accepted"): PlayerLink => ({
  id: "l1",
  ownerId: JAN,
  playerId: "r-tim",
  playerName: "Tim",
  inviteeId: TIM,
  status,
});

const profiles = (entries: [string, string][]) =>
  new Map<string, Profile>(entries.map(([userId, name]) => [userId, { userId, name, tag: "1234" }]));

describe("accountRenames", () => {
  it("gives an accepted player the account's name and remembers the old one", () => {
    const { roster, names } = accountRenames({
      userId: JAN,
      roster: [player("r-jan", "Jan"), player("r-tim", "Timmi")],
      selfPlayerId: null,
      links: [link()],
      profiles: profiles([[TIM, "Tim"]]),
    });
    expect(roster[1]).toMatchObject({ name: "Tim", formerNames: ["Timmi"] });
    expect(names).toEqual(new Map([["timmi", "Tim"]]));
  });

  it("leaves pending invites alone", () => {
    const { roster, names } = accountRenames({
      userId: JAN,
      roster: [player("r-tim", "Timmi")],
      selfPlayerId: null,
      links: [link("pending")],
      profiles: profiles([[TIM, "Tim"]]),
    });
    expect(roster[0].name).toBe("Timmi");
    expect(names.size).toBe(0);
  });

  it("renames the player marked as the user to their own account name", () => {
    const { roster } = accountRenames({
      userId: JAN,
      roster: [player("r-jan", "Ich")],
      selfPlayerId: "r-jan",
      links: [],
      profiles: profiles([[JAN, "Jan"]]),
    });
    expect(roster[0].name).toBe("Jan");
  });

  it("does not merge two roster players into one name", () => {
    const { roster, names } = accountRenames({
      userId: JAN,
      roster: [player("r-other", "Tim"), player("r-tim", "Timmi")],
      selfPlayerId: null,
      links: [link()],
      profiles: profiles([[TIM, "Tim"]]),
    });
    expect(roster.map((p) => p.name)).toEqual(["Tim", "Timmi"]);
    expect(names.size).toBe(0);
  });

  it("follows an account that renames itself again, keeping old names mapped", () => {
    const { roster, names } = accountRenames({
      userId: JAN,
      roster: [player("r-tim", "Tim", { formerNames: ["Timmi"] })],
      selfPlayerId: null,
      links: [link()],
      profiles: profiles([[TIM, "Timo"]]),
    });
    expect(roster[0]).toMatchObject({ name: "Timo", formerNames: ["Timmi", "Tim"] });
    expect(names).toEqual(
      new Map([
        ["timmi", "Timo"],
        ["tim", "Timo"],
      ]),
    );
  });

  it("is stable once applied", () => {
    const first = accountRenames({
      userId: JAN,
      roster: [player("r-tim", "Timmi")],
      selfPlayerId: null,
      links: [link()],
      profiles: profiles([[TIM, "Tim"]]),
    });
    const second = accountRenames({
      userId: JAN,
      roster: first.roster,
      selfPlayerId: null,
      links: [link()],
      profiles: profiles([[TIM, "Tim"]]),
    });
    expect(second.roster).toBe(first.roster);
    expect(second.names).toEqual(first.names);
  });
});

describe("renameIn", () => {
  const names = new Map([["timmi", "Tim"]]);

  it("renames players in a history", () => {
    const history = [
      { id: "a", players: [{ name: "Jan", score: 1 }, { name: "timmi ", score: 2 }] },
      { id: "b", players: [{ name: "Jan", score: 1 }] },
    ];
    const renamed = renameIn(history, names) as typeof history;
    expect(renamed[0].players[1].name).toBe("Tim");
    expect(renamed[1]).toBe(history[1]);
  });

  it("renames a running game and the Yatzy seating", () => {
    expect(renameIn({ id: "g", players: [{ id: "p1", name: "Timmi" }] }, names)).toEqual({
      id: "g",
      players: [{ id: "p1", name: "Tim" }],
    });
    expect(renameIn([{ name: "Timmi" }], names)).toEqual([{ name: "Tim" }]);
  });

  it("returns the same value when nothing matches", () => {
    const history = [{ id: "a", players: [{ name: "Jan" }] }];
    expect(renameIn(history, names)).toBe(history);
    expect(renameIn({ setting: true }, names)).toEqual({ setting: true });
  });
});
