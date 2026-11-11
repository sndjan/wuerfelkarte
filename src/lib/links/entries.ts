import { EMOJI_OPTIONS, type RosterPlayer } from "@/games/shared/types";
import { sameName, type PlayerLink, type Profile } from "./share";

/**
 * Which roster entry stands for an account: the user's own, and the one for
 * each person they are linked with. Links go both ways, so once Tim accepts
 * Jan's invite, Tim's roster needs an entry for Jan too. Pure, for tests.
 */

/**
 * The roster entry named like the account, or a new one when there is none.
 * New entries start unselected, so the next game's seating does not change.
 */
export function entryFor(
  roster: RosterPlayer[],
  name: string,
  taken: Set<string>,
): { roster: RosterPlayer[]; playerId: string } {
  const match = roster.find((p) => !taken.has(p.id) && sameName(p.name, name));
  if (match) return { roster, playerId: match.id };
  const player: RosterPlayer = {
    id: crypto.randomUUID(),
    name,
    emoji: EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)],
    active: false,
    selectionOrder: null,
  };
  return { roster: [...roster, player], playerId: player.id };
}

/** Accepted invites to this user whose way back is not recorded yet. */
export const missingWaysBack = (links: PlayerLink[], userId: string): PlayerLink[] =>
  links.filter(
    (link) =>
      link.inviteeId === userId &&
      link.status === "accepted" &&
      !links.some((other) => other.ownerId === userId && other.inviteeId === link.ownerId),
  );

/** Roster entries already standing for an account, which another account must not take. */
export const linkedEntries = (links: PlayerLink[], userId: string, selfPlayerId: string | null) =>
  new Set([
    ...links.filter((l) => l.ownerId === userId).map((l) => l.playerId),
    ...(selfPlayerId ? [selfPlayerId] : []),
  ]);

/** The user's own entry when none is marked yet: the one carrying their account name. */
export function findSelf(roster: RosterPlayer[], own: Profile, taken: Set<string>): string | null {
  return roster.find((p) => !taken.has(p.id) && sameName(p.name, own.name))?.id ?? null;
}
