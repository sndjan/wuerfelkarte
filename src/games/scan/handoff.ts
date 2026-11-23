/**
 * What the Würfelkarte needs to know about a sheet taken over from the paper
 * block: fields the players should look at (values the reader was unsure
 * of, and ones that cannot be right, which arrive empty), and that the totals
 * stay covered until the scoreboard has counted them up. Kept per game id, on
 * this device only (not synced).
 */

const KEY = "scan:check";

export type ScanCheck = {
  /** The running Yatzy game this belongs to. */
  id: string;
  /** Player name → field keys to check; dropped one by one as they are entered. */
  cells: Record<string, string[]>;
  /** The scoreboard has not been opened yet: no total may show before it. */
  reveal: boolean;
};

const NONE = { cells: {}, reveal: false };

export function saveScanCheck(check: ScanCheck): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(check));
  } catch {
    // Without storage the board just shows no marks.
  }
}

/** The state for this game, or nothing (another game, nothing scanned, no storage). */
export function loadScanCheck(gameId: string | undefined): Omit<ScanCheck, "id"> {
  if (!gameId) return NONE;
  try {
    const check = JSON.parse(localStorage.getItem(KEY) ?? "null") as ScanCheck | null;
    if (check?.id !== gameId || !check.cells || typeof check.cells !== "object") return NONE;
    return { cells: check.cells, reveal: check.reveal === true };
  } catch {
    return NONE;
  }
}

/** Keeps what is left; clears the entry once nothing is. */
export function updateScanCheck(gameId: string, state: Omit<ScanCheck, "id">): void {
  const cells = Object.fromEntries(Object.entries(state.cells).filter(([, keys]) => keys.length > 0));
  try {
    if (Object.keys(cells).length === 0 && !state.reveal) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ id: gameId, cells, reveal: state.reveal }));
  } catch {
    // ignore
  }
}
