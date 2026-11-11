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

/**
 * Adds received matches to a history. A newer copy replaces an older received
 * one (the owner corrected a score); a match this device recorded itself is
 * never replaced.
 */
export function receiveMatches(
  local: SharedMatch[],
  incoming: { match: unknown; sharedBy: string }[],
): SharedMatch[] {
  const byId = new Map(local.map((m) => [m.id, m]));
  for (const { match, sharedBy } of incoming) {
    if (!isStoredMatch(match)) continue;
    const existing = byId.get(match.id);
    if (existing && !existing.sharedBy) continue;
    byId.set(match.id, { ...match, sharedBy });
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}
