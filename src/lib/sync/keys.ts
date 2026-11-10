/**
 * Which localStorage keys travel with an account. Everything a player would
 * miss on another device does: the roster, histories, running games and
 * settings. Device-only state stays out: the anonymous quiz and speedrun
 * submissions (their tokens must not link days together), the migration
 * marker, the seasonal switch and the sync's own bookkeeping.
 */

const GAME_KEY = /^[a-z0-9]+:(game|matches|settings)$/;

const EXTRA_KEYS = new Set(["wuerfelkarte:roster", "yatzy:players", "quiz:days", "speedrun:daily"]);

export const isSyncedKey = (key: string): boolean =>
  EXTRA_KEYS.has(key) || (GAME_KEY.test(key) && !key.startsWith("wuerfelkarte:"));

/** Every synced key this browser currently holds. */
export function localSyncedKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null && isSyncedKey(key)) keys.push(key);
    }
  } catch {
    // Storage unavailable — nothing to sync.
  }
  return keys;
}
