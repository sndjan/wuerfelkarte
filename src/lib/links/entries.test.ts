import { describe, expect, it } from "vitest";
import type { RosterPlayer } from "@/games/shared/types";
import { entryFor, findSelf, linkedEntries, missingWaysBack } from "./entries";
import type { PlayerLink } from "./share";

const JAN = "jan-id";
const TIM = "tim-id";

const player = (id: string, name: string): RosterPlayer => ({ id, name, emoji: "🐸", active: true, selectionOrder: 1 });

const link = (overrides: Partial<PlayerLink>): PlayerLink => ({
  id: "l1",
  ownerId: JAN,
  playerId: "r-tim",
  playerName: "Tim",
  inviteeId: TIM,
  status: "accepted",
  ...overrides,
});

describe("entryFor", () => {
  it("uses the roster entry named like the account", () => {
    const roster = [player("a", "Tim"), player("b", " jan ")];
    expect(entryFor(roster, "Jan", new Set())).toEqual({ roster, playerId: "b" });
  });

  it("adds an unselected entry when none matches or the match stands for someone else", () => {
    const roster = [player("b", "Jan")];
    const { roster: next, playerId } = entryFor(roster, "Jan", new Set(["b"]));
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ id: playerId, name: "Jan", active: false, selectionOrder: null });
  });
});

describe("missingWaysBack", () => {
  it("lists accepted invites to the user without a link back", () => {
    const incoming = link({});
    expect(missingWaysBack([incoming], TIM)).toEqual([incoming]);
    expect(missingWaysBack([incoming, link({ id: "l2", ownerId: TIM, inviteeId: JAN, playerId: "t-jan" })], TIM)).toEqual([]);
  });

  it("ignores pending invites and the user's own links", () => {
    expect(missingWaysBack([link({ status: "pending" })], TIM)).toEqual([]);
    expect(missingWaysBack([link({})], JAN)).toEqual([]);
  });
});

describe("findSelf", () => {
  it("finds the entry with the account name that stands for nobody else", () => {
    const roster = [player("a", "Jan"), player("b", "Tim")];
    const own = { userId: JAN, name: "jan", tag: "1234" };
    expect(findSelf(roster, own, new Set())).toBe("a");
    expect(findSelf(roster, own, linkedEntries([link({ playerId: "a" })], JAN, null))).toBeNull();
  });
});
