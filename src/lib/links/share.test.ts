import { describe, expect, it } from "vitest";
import type { RosterPlayer } from "@/games/shared/types";
import { matchesToShare, receiveMatches, type PlayerLink, type SharedMatch } from "./share";

const JAN = "jan-id";
const TIM = "tim-id";

const link = (overrides: Partial<PlayerLink> = {}): PlayerLink => ({
  id: "l1",
  ownerId: JAN,
  ownerEmail: "jan@example.com",
  playerId: "r-tim",
  playerName: "Tim",
  inviteeEmail: "tim@example.com",
  inviteeId: TIM,
  status: "accepted",
  ...overrides,
});

const roster: RosterPlayer[] = [{ id: "r-tim", name: "Tim", emoji: "🐸", active: true, selectionOrder: 1 }];

const match = (id: string, names: string[], day = 1): SharedMatch => ({
  id,
  gamemode: "classic",
  timestamp: `2026-11-0${day}T10:00:00.000Z`,
  players: names.map((name) => ({ name, score: 10 })),
});

describe("matchesToShare", () => {
  it("shares matches with the linked player in them", () => {
    const { rows } = matchesToShare({
      userId: JAN,
      links: [link()],
      roster,
      matchesByGame: { wizard: [match("a", ["Jan", "tim "]), match("b", ["Jan", "Tom"])] },
      sent: {},
    });
    expect(rows.map((r) => [r.game, r.matchId, r.recipientId])).toEqual([["wizard", "a", TIM]]);
  });

  it("waits for the invite to be accepted", () => {
    const { rows } = matchesToShare({
      userId: JAN,
      links: [link({ status: "pending", inviteeId: null })],
      roster,
      matchesByGame: { wizard: [match("a", ["Tim"])] },
      sent: {},
    });
    expect(rows).toEqual([]);
  });

  it("follows a renamed roster player", () => {
    const renamed = [{ ...roster[0], name: "Timmy" }];
    const { rows } = matchesToShare({
      userId: JAN,
      links: [link()],
      roster: renamed,
      matchesByGame: { cabo: [match("a", ["Tim"]), match("b", ["Timmy"])] },
      sent: {},
    });
    expect(rows.map((r) => r.matchId)).toEqual(["b"]);
  });

  it("sends a match again only when it changed", () => {
    const first = matchesToShare({
      userId: JAN,
      links: [link()],
      roster,
      matchesByGame: { yatzy: [match("a", ["Tim"])] },
      sent: {},
    });
    const again = matchesToShare({
      userId: JAN,
      links: [link()],
      roster,
      matchesByGame: { yatzy: [match("a", ["Tim"])] },
      sent: first.fingerprints,
    });
    expect(again.rows).toEqual([]);
    const corrected = matchesToShare({
      userId: JAN,
      links: [link()],
      roster,
      matchesByGame: { yatzy: [{ ...match("a", ["Tim"]), durationMs: 5 }] },
      sent: first.fingerprints,
    });
    expect(corrected.rows).toHaveLength(1);
  });

  it("never passes on received matches or shares through someone else's link", () => {
    const { rows } = matchesToShare({
      userId: TIM,
      links: [link()],
      roster,
      matchesByGame: { flip7: [{ ...match("a", ["Tim"]), sharedBy: "jan@example.com" }] },
      sent: {},
    });
    expect(rows).toEqual([]);
  });
});

describe("receiveMatches", () => {
  it("adds received matches in time order, marked with the sender", () => {
    const merged = receiveMatches(
      [match("own", ["Tim"], 2)],
      [{ match: match("a", ["Jan", "Tim"], 1), ownerEmail: "jan@example.com" }],
    );
    expect(merged.map((m) => [m.id, m.sharedBy])).toEqual([
      ["a", "jan@example.com"],
      ["own", undefined],
    ]);
  });

  it("updates a received match but never one recorded here", () => {
    const local = [{ ...match("a", ["Tim"]), sharedBy: "jan@example.com" }, match("b", ["Tim"])];
    const merged = receiveMatches(local, [
      { match: { ...match("a", ["Tim"]), durationMs: 9 }, ownerEmail: "jan@example.com" },
      { match: { ...match("b", ["Tim"]), durationMs: 9 }, ownerEmail: "jan@example.com" },
      { match: { nonsense: true }, ownerEmail: "jan@example.com" },
    ]);
    expect(merged.find((m) => m.id === "a")?.durationMs).toBe(9);
    expect(merged.find((m) => m.id === "b")?.durationMs).toBeUndefined();
    expect(merged).toHaveLength(2);
  });
});
