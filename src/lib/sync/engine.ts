import { readJSON, writeJSON, removeKey } from "@/games/shared/storage";
import { isSyncedKey, localSyncedKeys } from "./keys";
import { mergeValues } from "./merge";

/**
 * The account sync, without any React or Supabase: localStorage stays the
 * app's only storage, and this copies changed keys to and from a remote that
 * keeps one row per key.
 *
 * Every key the app changes is marked dirty and uploaded. Downloads ask for
 * rows changed since the last one seen; a row this device did not change is
 * taken as it is, a row it did change too goes through `mergeValues`. The
 * server stamps each row on write, and `versions` remembers the stamp this
 * device last uploaded or took, so its own uploads coming back are not
 * mistaken for news from another device.
 */

export type RemoteRow = { key: string; value: unknown; updatedAt: string };

export interface SyncRemote {
  /** Rows changed after `since` (all rows for `null`), oldest first. */
  pull(since: string | null): Promise<RemoteRow[]>;
  /** Stores the rows and returns their new stamps. */
  push(rows: { key: string; value: unknown }[]): Promise<{ key: string; updatedAt: string }[]>;
}

type SyncMeta = {
  userId: string;
  /** Stamp of the newest row downloaded. */
  cursor: string | null;
  dirty: string[];
  versions: Record<string, string>;
};

export const SYNC_META_KEY = "wuerfelkarte:sync";

/**
 * Rows are stamped when their write starts, so a slow write can land behind
 * the cursor. Asking again for a short while before it costs only a few rows
 * that `versions` then skips.
 */
const PULL_OVERLAP_MS = 60_000;

const loadMeta = (): SyncMeta | null => {
  const meta = readJSON<SyncMeta | null>(SYNC_META_KEY, null);
  return meta && typeof meta.userId === "string" && Array.isArray(meta.dirty) ? { ...meta, versions: meta.versions ?? {} } : null;
};

const saveMeta = (meta: SyncMeta) => writeJSON(SYNC_META_KEY, meta);

/**
 * Ties this browser to an account. A browser new to the account uploads
 * everything it holds, so games played before signing in join the account.
 */
export function linkDevice(userId: string): void {
  if (loadMeta()?.userId === userId) return;
  saveMeta({ userId, cursor: null, dirty: localSyncedKeys(), versions: {} });
}

/** Forgets the account; the games stay on this device. */
export const unlinkDevice = (): void => removeKey(SYNC_META_KEY);

export function markDirty(key: string): void {
  const meta = loadMeta();
  if (!meta || !isSyncedKey(key) || meta.dirty.includes(key)) return;
  saveMeta({ ...meta, dirty: [...meta.dirty, key] });
}

export const hasPendingChanges = (): boolean => (loadMeta()?.dirty.length ?? 0) > 0;

const readRaw = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const parse = (raw: string | null): unknown => {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Writes around `writeJSON`, which would report the download as a local
 * change and upload it straight back. Returns whether the stored value changed.
 */
function writeDownloaded(key: string, value: unknown): boolean {
  const before = readRaw(key);
  const after = value === null || value === undefined ? null : JSON.stringify(value);
  if (before === after) return false;
  try {
    if (after === null) localStorage.removeItem(key);
    else localStorage.setItem(key, after);
  } catch {
    return false;
  }
  return true;
}

const pullSince = (cursor: string | null) =>
  cursor === null ? null : new Date(Date.parse(cursor) - PULL_OVERLAP_MS).toISOString();

/**
 * One round trip: download, then upload. Returns whether local data changed,
 * so open screens can re-read it. Throws when the remote fails; the dirty
 * keys stay marked for the next attempt.
 */
export async function runSync(remote: SyncRemote, userId: string): Promise<{ changed: boolean }> {
  let meta = loadMeta();
  if (!meta || meta.userId !== userId) return { changed: false };

  let changed = false;
  const rows = await remote.pull(pullSince(meta.cursor));

  // The app may have written while the download was under way.
  meta = loadMeta();
  if (!meta || meta.userId !== userId) return { changed: false };
  const dirty = new Set(meta.dirty);
  const versions = { ...meta.versions };
  let cursor = meta.cursor;

  for (const row of rows) {
    if (cursor === null || Date.parse(row.updatedAt) > Date.parse(cursor)) cursor = row.updatedAt;
    if (!isSyncedKey(row.key) || versions[row.key] === row.updatedAt) continue;
    versions[row.key] = row.updatedAt;
    const value = dirty.has(row.key) ? mergeValues(row.key, parse(readRaw(row.key)), row.value) : row.value;
    if (writeDownloaded(row.key, value)) changed = true;
  }
  meta = { ...meta, cursor, versions };
  saveMeta(meta);

  if (dirty.size > 0) {
    const sent = [...dirty].map((key) => ({ key, raw: readRaw(key) }));
    const stamps = await remote.push(sent.map(({ key, raw }) => ({ key, value: parse(raw) })));

    // Keys written again during the upload stay dirty for the next round.
    meta = loadMeta();
    if (!meta || meta.userId !== userId) return { changed };
    const stillDirty = new Set(meta.dirty);
    for (const { key, raw } of sent) if (readRaw(key) === raw) stillDirty.delete(key);
    const pushedVersions = Object.fromEntries(stamps.map((s) => [s.key, s.updatedAt]));
    saveMeta({ ...meta, dirty: [...stillDirty], versions: { ...meta.versions, ...pushedVersions } });
  }

  return { changed };
}
