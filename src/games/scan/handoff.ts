/**
 * Fields of a scanned sheet the players should look at once it is on the
 * Würfelkarte: values the reader was unsure of, and ones that cannot be
 * right (those arrive empty). Kept per game id, on this device only (not
 * synced), and dropped field by field as the players enter them.
 */

const KEY = "scan:check";

export type ScanCheck = {
  /** The running Yatzy game the flags belong to. */
  id: string;
  /** Player name → field keys to check. */
  cells: Record<string, string[]>;
};

export function saveScanCheck(check: ScanCheck): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(check));
  } catch {
    // Without storage the board just shows no marks.
  }
}

/** The flags for this game, or none (another game, nothing scanned, no storage). */
export function loadScanCheck(gameId: string | undefined): Record<string, string[]> {
  if (!gameId) return {};
  try {
    const check = JSON.parse(localStorage.getItem(KEY) ?? "null") as ScanCheck | null;
    return check?.id === gameId && check.cells && typeof check.cells === "object" ? check.cells : {};
  } catch {
    return {};
  }
}

/** Keeps what is left to check; clears the entry once nothing is. */
export function updateScanCheck(gameId: string, cells: Record<string, string[]>): void {
  const left = Object.fromEntries(Object.entries(cells).filter(([, keys]) => keys.length > 0));
  try {
    if (Object.keys(left).length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ id: gameId, cells: left }));
  } catch {
    // ignore
  }
}
