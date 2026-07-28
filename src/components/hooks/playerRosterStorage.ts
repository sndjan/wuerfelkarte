import { RosterPlayer } from "@/components/yatzy-lobby/types";

export const ROSTER_STORAGE_KEY = "kniffel:roster";

const backfillSelectionOrder = (roster: RosterPlayer[]): RosterPlayer[] => {
  let nextOrder = nextSelectionOrder(roster);
  return roster.map((p) =>
    p.active && p.selectionOrder == null
      ? { ...p, selectionOrder: nextOrder++ }
      : p,
  );
};

export const nextSelectionOrder = (roster: RosterPlayer[]): number =>
  Math.max(0, ...roster.map((p) => p.selectionOrder ?? 0)) + 1;

export const loadRoster = (): RosterPlayer[] => {
  try {
    const stored = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (!stored) return [];
    return backfillSelectionOrder(JSON.parse(stored) as RosterPlayer[]);
  } catch {
    return [];
  }
};

export const saveRoster = (roster: RosterPlayer[]) => {
  try {
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
  } catch {
    // Handle storage errors silently
  }
};

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

/** A player joining a running game counts as selected for the lobby too. */
export const activateRosterPlayerByName = (name: string) => {
  const roster = loadRoster();
  const key = name.trim().toLowerCase();
  const match = roster.find((p) => p.name.trim().toLowerCase() === key);
  if (!match || match.active) return;
  const order = nextSelectionOrder(roster);
  saveRoster(
    roster.map((p) =>
      p.id === match.id ? { ...p, active: true, selectionOrder: order } : p,
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

export const updateRosterPlayerByName = (
  currentName: string,
  name: string,
  emoji?: string,
) => {
  const roster = loadRoster();
  const match = roster.find(
    (p) => p.name.toLowerCase() === currentName.trim().toLowerCase(),
  );
  if (!match) return;
  saveRoster(
    roster.map((p) =>
      p.id === match.id ? { ...p, name, emoji: emoji ?? p.emoji } : p,
    ),
  );
};
