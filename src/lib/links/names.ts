import type { RosterPlayer } from "@/games/shared/types";
import { sameName, type PlayerLink, type Profile } from "./share";

/**
 * Linked players carry their account's name. When a link is accepted, or the
 * account renames itself, the roster entry takes the new name and every
 * stored match and running game follows, so statistics keep counting one
 * person. The same goes for the roster entry marked as the user themselves.
 *
 * Statistics tell players apart by name, so a rename that would merge two
 * roster players into one name is skipped.
 */

/** How many earlier names a roster entry remembers. */
const FORMER_NAMES = 5;

export type Renames = {
  roster: RosterPlayer[];
  /** Lower-cased old name → new name, for matches and running games. */
  names: Map<string, string>;
};

export function accountRenames({
  userId,
  roster,
  selfPlayerId,
  links,
  profiles,
}: {
  userId: string;
  roster: RosterPlayer[];
  selfPlayerId: string | null;
  links: PlayerLink[];
  profiles: Map<string, Profile>;
}): Renames {
  const targets = new Map<string, string>();
  const own = profiles.get(userId);
  if (selfPlayerId && own) targets.set(selfPlayerId, own.name);
  for (const link of links) {
    const profile = profiles.get(link.inviteeId);
    if (link.ownerId === userId && link.status === "accepted" && profile) targets.set(link.playerId, profile.name);
  }

  let next = roster;
  const names = new Map<string, string>();
  for (const [playerId, accountName] of targets) {
    const player = next.find((p) => p.id === playerId);
    if (!player) continue;
    const taken = (name: string) => next.some((p) => p.id !== playerId && sameName(p.name, name));
    if (taken(accountName)) continue;

    // Earlier names catch matches finished on a board that was open during the rename.
    const formerNames = [...(player.formerNames ?? []), player.name]
      .filter((name, i, all) => !sameName(name, accountName) && all.findIndex((n) => sameName(n, name)) === i)
      .slice(-FORMER_NAMES);
    for (const name of formerNames) if (!taken(name)) names.set(name.trim().toLowerCase(), accountName);

    if (player.name !== accountName || (player.formerNames ?? []).join() !== formerNames.join()) {
      next = next.map((p) =>
        p.id === playerId ? { ...p, name: accountName, formerNames: formerNames.length ? formerNames : undefined } : p,
      );
    }
  }
  return { roster: next, names };
}

type Named = { name?: unknown };

const renamePlayers = <T extends Named>(players: T[], names: Map<string, string>): T[] =>
  players.map((p) => {
    if (typeof p?.name !== "string") return p;
    const to = names.get(p.name.trim().toLowerCase());
    return to && to !== p.name ? { ...p, name: to } : p;
  });

/**
 * Applies renames to anything stored with players in it: a history (array
 * of matches), a running game (object with `players`) or the Yatzy seating
 * (array of players). Returns the same value when nothing changed.
 */
export function renameIn(value: unknown, names: Map<string, string>): unknown {
  if (names.size === 0 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const looksLikePlayers = value.every((v) => v && typeof v === "object" && "name" in v && !("players" in v));
    const next = looksLikePlayers
      ? renamePlayers(value as Named[], names)
      : value.map((item) => renameIn(item, names));
    return next.some((item, i) => item !== value[i]) ? next : value;
  }
  const record = value as { players?: unknown };
  if (!Array.isArray(record.players)) return value;
  const players = renamePlayers(record.players as Named[], names);
  return players.some((p, i) => p !== (record.players as Named[])[i]) ? { ...record, players } : value;
}
