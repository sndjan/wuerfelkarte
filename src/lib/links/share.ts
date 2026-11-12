import type { MatchPlayer, RosterPlayer, StoredMatch } from "@/games/shared/types";

/**
 * Which matches go to a linked player's account, and how received ones join
 * the local history. Pure, so the rules are tested without a server.
 */

/** Games played around a table with named players; the solo modes have no one to share with. */
export const SHARED_GAMES = ["yatzy", "wizard", "flip7", "cabo", "darts"] as const;

/** An account's public identity: the name it picked plus a tag, "Jan#4821". */
export type Profile = { userId: string; name: string; tag: string };

export const handleOf = (profile: Pick<Profile, "name" | "tag">) => `${profile.name}#${profile.tag}`;

export type PlayerLink = {
  id: string;
  ownerId: string;
  playerId: string;
  /** The roster name when the invite was sent. */
  playerName: string;
  inviteeId: string;
  status: "pending" | "accepted";
};

/** A match as another account's device recorded it, marked with that account's handle. */
export type SharedMatch = StoredMatch<MatchPlayer> & {
  sharedBy?: string;
  /** Played online: every player's account already has it. */
  online?: boolean;
};

export type ShareRow = { recipientId: string; game: string; matchId: string; match: SharedMatch };

export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** FNV-1a: enough to tell whether a match changed since it was last sent. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

export const isStoredMatch = (value: unknown): value is SharedMatch => {
  const match = value as SharedMatch | null;
  return (
    typeof match === "object" &&
    match !== null &&
    typeof match.id === "string" &&
    typeof match.timestamp === "string" &&
    typeof match.gamemode === "string" &&
    Array.isArray(match.players) &&
    match.players.every((p) => p && typeof p.name === "string")
  );
};

/**
 * Every match this account recorded with a player it linked, which has not
 * been sent in this exact form yet. Matches received from someone else are
 * never passed on, and neither are online games, which every player's
 * account records itself. The roster's current name counts, so a renamed player
 * keeps their link; matches are found by the name they were played under.
 */
export function matchesToShare({
  userId,
  links,
  roster,
  matchesByGame,
  sent,
}: {
  userId: string;
  links: PlayerLink[];
  roster: RosterPlayer[];
  matchesByGame: Record<string, SharedMatch[]>;
  sent: Record<string, string>;
}): { rows: ShareRow[]; fingerprints: Record<string, string> } {
  const rows: ShareRow[] = [];
  const fingerprints: Record<string, string> = {};
  const linked = links.filter((l) => l.ownerId === userId && l.status === "accepted");

  for (const link of linked) {
    const name = roster.find((p) => p.id === link.playerId)?.name ?? link.playerName;
    for (const [game, matches] of Object.entries(matchesByGame)) {
      for (const match of matches) {
        if (!isStoredMatch(match) || match.sharedBy || match.online) continue;
        if (!match.players.some((p) => sameName(p.name, name))) continue;
        const key = `${game}/${match.id}/${link.inviteeId}`;
        const print = fingerprint(JSON.stringify(match));
        if (sent[key] === print) continue;
        fingerprints[key] = print;
        rows.push({ recipientId: link.inviteeId, game, matchId: match.id, match });
      }
    }
  }
  return { rows, fingerprints };
}

const MAX_RECEIVED_BYTES = 20_000;
const MAX_NAME = 60;

const isCount = (value: unknown) => value === undefined || (typeof value === "number" && Number.isFinite(value));

/**
 * A match another account sent is checked harder than one this device
 * wrote: it goes into the history, the statistics and the account sync, so a
 * broken one would break those screens on every device of the user.
 */
export function isReceivable(game: string, value: unknown): value is SharedMatch {
  if (!isStoredMatch(value)) return false;
  let size: number;
  try {
    size = JSON.stringify(value).length;
  } catch {
    return false;
  }
  if (size > MAX_RECEIVED_BYTES) return false;
  if (value.id.length === 0 || value.id.length > 64 || value.gamemode.length > 40) return false;
  if (Number.isNaN(Date.parse(value.timestamp)) || !isCount(value.durationMs)) return false;
  if (value.players.length === 0 || value.players.length > 20) return false;
  return value.players.every((raw) => {
    const player = raw as MatchPlayer & { points?: unknown; doubled?: unknown };
    if (typeof player !== "object" || player.name.trim().length === 0 || player.name.length > MAX_NAME) return false;
    if (typeof player.score !== "number" || !Number.isFinite(player.score)) return false;
    if (player.emoji !== undefined && (typeof player.emoji !== "string" || player.emoji.length > 16)) return false;
    if (game === "yatzy") {
      const { points, doubled } = player;
      // Matches from before the sheet was stored have no points.
      if (points === undefined) return doubled === undefined;
      if (typeof points !== "object" || points === null || Array.isArray(points)) return false;
      if (!Object.values(points).every((v) => typeof v === "number" || typeof v === "string")) return false;
      if (doubled !== undefined && !(Array.isArray(doubled) && doubled.every((f) => typeof f === "string"))) return false;
    }
    return true;
  });
}

/**
 * Adds received matches to a history. A newer copy replaces an older received
 * one (the owner corrected a score); a match this device recorded itself is
 * never replaced.
 */
export function receiveMatches(
  local: SharedMatch[],
  incoming: { match: unknown; sharedBy: string }[],
  game = "",
): SharedMatch[] {
  const byId = new Map(local.map((m) => [m.id, m]));
  for (const { match, sharedBy } of incoming) {
    if (!isReceivable(game, match)) continue;
    const existing = byId.get(match.id);
    if (existing && !existing.sharedBy) continue;
    byId.set(match.id, { ...match, sharedBy });
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}
