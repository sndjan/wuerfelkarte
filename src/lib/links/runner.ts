import type { SupabaseClient } from "@supabase/supabase-js";

import { loadRoster, saveRoster } from "@/games/shared/roster";
import { readJSON, removeKey, writeJSON } from "@/games/shared/storage";
import { LinksUnavailableError, fetchLinkState, isMissingTable } from "./api";
import { accountRenames, renameIn, type RenameNotice } from "./names";
import { loadSelfPlayerId } from "./self";
import { SHARED_GAMES, handleOf, matchesToShare, receiveMatches, type SharedMatch } from "./share";

/**
 * Runs after each account sync: gives linked players (and the user's own
 * roster entry) their account names, sends matches with linked players to
 * their accounts and adds matches others sent here to the local history
 * (which the account sync then carries to this user's other devices).
 */

type SharingState = {
  userId: string;
  /** Stamp of the newest received match. */
  cursor: string | null;
  /** Fingerprint of each match as last sent, per game, match and recipient. */
  sent: Record<string, string>;
};

const STATE_KEY = "wuerfelkarte:sharing";
const PULL_OVERLAP_MS = 60_000;
const BATCH = 100;

const loadState = (userId: string): SharingState => {
  const state = readJSON<SharingState | null>(STATE_KEY, null);
  return state?.userId === userId ? state : { userId, cursor: null, sent: {} };
};

export const forgetSharing = () => removeKey(STATE_KEY);

const matchesKey = (game: string) => `${game}:matches`;

/** Keys holding players by name that a rename has to reach. */
const RENAMED_KEYS = [
  ...SHARED_GAMES.flatMap((game) => [`${game}:matches`, `${game}:game`]),
  "yatzy:players",
];

/** Writes account names into the roster, histories and running games. */
function applyAccountNames(
  userId: string,
  linkState: Awaited<ReturnType<typeof fetchLinkState>>,
): { changed: boolean; notices: RenameNotice[] } {
  const roster = loadRoster();
  const { roster: renamed, names, notices } = accountRenames({
    userId,
    roster,
    selfPlayerId: loadSelfPlayerId(),
    links: linkState.links,
    profiles: linkState.profiles,
  });
  let changed = false;
  if (renamed !== roster) {
    saveRoster(renamed);
    changed = true;
  }
  for (const key of RENAMED_KEYS) {
    const value = readJSON<unknown>(key, null);
    const next = renameIn(value, names);
    if (next !== value) {
      writeJSON(key, next);
      changed = true;
    }
  }
  return { changed, notices };
}

export type SharingResult = { changed: boolean; notices: RenameNotice[] };

/**
 * Returns whether local data changed and which players had to give up their
 * name. Missing tables mean nothing to do.
 */
export async function runSharing(client: SupabaseClient, userId: string): Promise<SharingResult> {
  let linkState;
  try {
    linkState = await fetchLinkState(client);
  } catch (error) {
    if (error instanceof LinksUnavailableError) return { changed: false, notices: [] };
    throw error;
  }
  const { links, profiles } = linkState;
  let state = loadState(userId);
  const renamed = applyAccountNames(userId, linkState);
  let changed = renamed.changed;

  const matchesByGame = Object.fromEntries(
    SHARED_GAMES.map((game) => [game, readJSON<SharedMatch[]>(matchesKey(game), [])]),
  );
  const { rows, fingerprints } = matchesToShare({
    userId,
    links,
    roster: loadRoster(),
    matchesByGame,
    sent: state.sent,
  });
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await client.from("shared_matches").upsert(
      batch.map((row) => ({
        owner_id: userId,
        recipient_id: row.recipientId,
        game: row.game,
        match_id: row.matchId,
        match: row.match,
      })),
      { onConflict: "owner_id,recipient_id,game,match_id" },
    );
    if (error) {
      if (isMissingTable(error)) return { changed, notices: renamed.notices };
      throw new Error(error.message);
    }
    const done = Object.fromEntries(
      batch.map((row) => {
        const key = `${row.game}/${row.matchId}/${row.recipientId}`;
        return [key, fingerprints[key]];
      }),
    );
    state = { ...state, sent: { ...state.sent, ...done } };
    writeJSON(STATE_KEY, state);
  }

  let query = client
    .from("shared_matches")
    .select("owner_id, game, match, updated_at")
    .eq("recipient_id", userId)
    .order("updated_at")
    .limit(1000);
  if (state.cursor) {
    query = query.gt("updated_at", new Date(Date.parse(state.cursor) - PULL_OVERLAP_MS).toISOString());
  }
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return { changed, notices: renamed.notices };
    throw new Error(error.message);
  }
  const received = (data ?? []) as { owner_id: string; game: string; match: unknown; updated_at: string }[];

  const senderOf = (ownerId: string) => {
    const profile = profiles.get(ownerId);
    return profile ? handleOf(profile) : "";
  };
  for (const game of SHARED_GAMES) {
    const incoming = received
      .filter((row) => row.game === game)
      .map((row) => ({ match: row.match, sharedBy: senderOf(row.owner_id) }));
    if (incoming.length === 0) continue;
    const key = matchesKey(game);
    const before = JSON.stringify(readJSON(key, []));
    const merged = receiveMatches(readJSON<SharedMatch[]>(key, []), incoming);
    if (JSON.stringify(merged) !== before) {
      writeJSON(key, merged);
      changed = true;
    }
  }

  const newest = received.at(-1)?.updated_at;
  if (newest && (!state.cursor || Date.parse(newest) > Date.parse(state.cursor))) {
    writeJSON(STATE_KEY, { ...state, cursor: newest });
  }
  return { changed, notices: renamed.notices };
}
