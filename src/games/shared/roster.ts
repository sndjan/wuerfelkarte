import { ROSTER_KEY, migrateLegacyStorage } from "./migrations";
import { readJSON, writeJSON } from "./storage";
import { RosterPlayer } from "./types";

/**
 * The app-wide player roster. It belongs to no single game — every lobby picks
 * its players from this one list, and a game that adds a player mid-play adds
 * them here too.
 */

export const nextSelectionOrder = (roster: RosterPlayer[]): number =>
  Math.max(0, ...roster.map((p) => p.selectionOrder ?? 0)) + 1;

/** Entries written before selection order existed get one on first read. */
const backfillSelectionOrder = (roster: RosterPlayer[]): RosterPlayer[] => {
  let order = nextSelectionOrder(roster);
  return roster.map((p) =>
    p.active && p.selectionOrder == null ? { ...p, selectionOrder: order++ } : p,
  );
};

export const loadRoster = (): RosterPlayer[] => {
  // The roster is auto-saved by usePlayerRoster, so reading it before the
  // legacy migration ran would persist an empty list over the old data. The
  // schema check inside makes this call free after the first one.
  migrateLegacyStorage();
  const roster = readJSON<RosterPlayer[]>(ROSTER_KEY, []);
  return Array.isArray(roster) ? backfillSelectionOrder(roster) : [];
};

export const saveRoster = (roster: RosterPlayer[]) => writeJSON(ROSTER_KEY, roster);

export const createRosterPlayer = (
  name: string,
  emoji: string,
  roster: RosterPlayer[],
): RosterPlayer => ({
  id: crypto.randomUUID(),
  name,
  emoji,
  active: true,
  selectionOrder: nextSelectionOrder(roster),
});

/**
 * Read-modify-write helpers for callers outside the lobby (e.g. the in-game
 * player dialog) that must not hold roster state of their own — they would go
 * stale against whatever the lobby wrote last.
 */
export const addRosterPlayer = (name: string, emoji: string) => {
  const roster = loadRoster();
  saveRoster([...roster, createRosterPlayer(name, emoji, roster)]);
};

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** A player joining a running game counts as selected for the lobby too. */
export const activateRosterPlayerByName = (name: string) => {
  const roster = loadRoster();
  const match = roster.find((p) => sameName(p.name, name));
  if (!match || match.active) return;
  const order = nextSelectionOrder(roster);
  saveRoster(
    roster.map((p) =>
      p.id === match.id ? { ...p, active: true, selectionOrder: order } : p,
    ),
  );
};

export const updateRosterPlayerByName = (
  currentName: string,
  name: string,
  emoji?: string,
) => {
  const roster = loadRoster();
  const match = roster.find((p) => sameName(p.name, currentName));
  if (!match) return;
  saveRoster(
    roster.map((p) =>
      p.id === match.id ? { ...p, name, emoji: emoji ?? p.emoji } : p,
    ),
  );
};

/**
 * Mirrors the in-game card order onto the stored roster, so reordering during a
 * game carries over to the lobby's selection order. Active roster players that
 * aren't in the game keep their relative order behind the ones that are;
 * inactive players are left untouched.
 */
export const syncRosterOrder = (orderedNames: string[]) => {
  const roster = loadRoster();
  if (roster.length === 0) return;

  const rank = new Map<string, number>();
  orderedNames.forEach((playerName) => {
    const key = playerName.trim().toLowerCase();
    if (!rank.has(key)) rank.set(key, rank.size + 1);
  });

  const rankOf = (player: RosterPlayer) =>
    player.active ? rank.get(player.name.trim().toLowerCase()) : undefined;

  let trailingOrder = rank.size;
  const trailing = new Map(
    roster
      .filter((p) => p.active && rankOf(p) === undefined)
      .sort((a, b) => (a.selectionOrder ?? 0) - (b.selectionOrder ?? 0))
      .map((p) => [p.id, ++trailingOrder] as const),
  );

  saveRoster(
    roster.map((p) => {
      const order = rankOf(p) ?? trailing.get(p.id);
      return order === undefined ? p : { ...p, selectionOrder: order };
    }),
  );
};

/** The players a lobby starts a game with, in the order they were picked. */
export const activePlayers = (roster: RosterPlayer[]): RosterPlayer[] =>
  roster
    .filter((player) => player.active)
    .sort((a, b) => (a.selectionOrder ?? 0) - (b.selectionOrder ?? 0));
