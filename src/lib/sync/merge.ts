/**
 * What to keep when a key changed both here and on another device since the
 * last sync. Collections are combined so no finished match or player is lost;
 * for everything else (a running game, settings) this device wins, because it
 * is the one in someone's hand right now.
 */

type WithId = { id?: unknown; name?: unknown; timestamp?: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizedName = (item: WithId) =>
  typeof item.name === "string" ? item.name.trim().toLowerCase() : null;

/**
 * Local entries first, then remote ones local does not have. With `byName`, a
 * remote entry also counts as known when its name is taken: the app tells
 * roster players apart by name, and two devices that each added "Anna"
 * before signing in should end up with one Anna.
 */
export function unionById<T extends WithId>(local: T[], remote: T[], byName = false): T[] {
  const ids = new Set(local.map((item) => item.id));
  const names = new Set(local.map(normalizedName).filter((name) => name !== null));
  const extra = remote.filter((item) => {
    if (ids.has(item.id)) return false;
    const name = normalizedName(item);
    return !(byName && name !== null && names.has(name));
  });
  return [...local, ...extra];
}

const byTimestamp = (a: WithId, b: WithId) =>
  typeof a.timestamp === "string" && typeof b.timestamp === "string"
    ? Date.parse(a.timestamp) - Date.parse(b.timestamp)
    : 0;

export function mergeValues(key: string, local: unknown, remote: unknown): unknown {
  if (key.endsWith(":matches") || key === "wuerfelkarte:roster") {
    if (!Array.isArray(remote)) return local;
    if (!Array.isArray(local)) return remote;
    if (key === "wuerfelkarte:roster") return unionById(local, remote, true);
    // Histories are stored oldest first; a stable sort keeps ties in place.
    return unionById(local, remote).sort(byTimestamp);
  }
  if (key === "quiz:days") {
    if (!isRecord(remote)) return local;
    if (!isRecord(local)) return remote;
    return { ...remote, ...local };
  }
  return local;
}
