import type { RosterPlayer } from "@/games/shared/types";
import { handleOf, sameName, type PlayerLink, type Profile } from "./share";

/**
 * Linked players carry their account's name. When a link is accepted, or the
 * account renames itself, the roster entry takes the new name and every
 * stored match and running game follows, so statistics keep counting one
 * person. The same goes for the roster entry marked as the user themselves.
 *
 * Statistics tell players apart by name, so two roster players must never
 * share one. When the account name is already taken:
 * - by an unlinked player, that player moves aside to "Tim (2)", their
 *   matches with them, and a notice says so;
 * - by another linked player who carries that name by right, the newcomer
 *   gets "Tim (2)" instead.
 */

/** How many earlier names a roster entry remembers. */
const FORMER_NAMES = 5;

/**
 * For the warning shown to the user. `moved`: an unlinked player gave up
 * their name to the account. `twin`: the account's name was already carried
 * by another linked player, so this one got a number.
 */
export type RenameNotice = { kind: "moved" | "twin"; from: string; to: string; account: string };

export type Renames = {
  roster: RosterPlayer[];
  /** Lower-cased old name → new name, for matches and running games. */
  names: Map<string, string>;
  notices: RenameNotice[];
};

const key = (name: string) => name.trim().toLowerCase();

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
  // Roster entry → the account whose name it carries.
  const targets = new Map<string, Profile>();
  const own = profiles.get(userId);
  if (selfPlayerId && own) targets.set(selfPlayerId, own);
  for (const link of links) {
    const profile = profiles.get(link.inviteeId);
    if (link.ownerId === userId && link.status === "accepted" && profile) targets.set(link.playerId, profile);
  }

  let next = roster;
  const names = new Map<string, string>();
  const notices: RenameNotice[] = [];
  const accountNames = [...targets.values()].map((profile) => profile.name);

  const holderOf = (name: string, exceptId: string) => next.find((p) => p.id !== exceptId && sameName(p.name, name));
  /** "Tim (2)", "Tim (3)", … — the first one no other player has and no account wants. */
  const freeName = (base: string, ownId: string) => {
    for (let n = 2; ; n++) {
      const candidate = `${base} (${n})`;
      if (!holderOf(candidate, ownId) && !accountNames.some((name) => sameName(name, candidate))) return candidate;
    }
  };
  const rename = (id: string, patch: Partial<RosterPlayer>) => {
    next = next.map((p) => (p.id === id ? { ...p, ...patch } : p));
  };

  for (const [playerId, profile] of targets) {
    const player = next.find((p) => p.id === playerId);
    if (!player) continue;
    const accountName = profile.name;

    let wanted = accountName;
    const holder = holderOf(accountName, playerId);
    if (holder) {
      const holderAccount = targets.get(holder.id);
      if (holderAccount !== undefined && sameName(holderAccount.name, accountName)) {
        // Both accounts are called Tim; the one already holding the name keeps it.
        wanted = freeName(accountName, playerId);
      } else if (holderAccount === undefined) {
        const moved = freeName(holder.name, holder.id);
        names.set(key(holder.name), moved);
        rename(holder.id, { name: moved });
        notices.push({ kind: "moved", from: holder.name, to: moved, account: handleOf(profile) });
      }
      // A linked holder whose own account name differs vacates the name later in this pass.
    }

    // Earlier names catch matches finished on a board that was open during the rename.
    const formerNames = [...(player.formerNames ?? []), player.name]
      .filter((name, i, all) => !sameName(name, wanted) && all.findIndex((n) => sameName(n, name)) === i)
      .slice(-FORMER_NAMES);
    for (const name of formerNames) {
      if (!holderOf(name, playerId) && !names.has(key(name))) names.set(key(name), wanted);
    }

    if (wanted !== accountName && player.name !== wanted) {
      notices.push({ kind: "twin", from: player.name, to: wanted, account: handleOf(profile) });
    }
    if (player.name !== wanted || (player.formerNames ?? []).join() !== formerNames.join()) {
      rename(playerId, { name: wanted, formerNames: formerNames.length ? formerNames : undefined });
    }
  }
  return { roster: next, names, notices };
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
