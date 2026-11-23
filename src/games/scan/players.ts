import type { RosterPlayer } from "@/games/shared/types";

/**
 * Who a scanned column belongs to. Handwriting is rarely spelled like the
 * roster, so names are compared loosely: case, accents and punctuation do
 * not count, one slip (two in long names) is forgiven, and a short form
 * ("Jo" for "Johanna") counts when nothing else fits. A roster player is
 * given to one column at most; a column nothing fits stays open for the
 * players to choose.
 */

export const normalizeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Edits between two names; swapped neighbours ("Jna") count as one. */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** How well a written name fits a roster player: 0 exact, higher worse, null not at all. */
function fit(written: string, player: Pick<RosterPlayer, "name" | "formerNames">): number | null {
  const w = normalizeName(written);
  if (!w) return null;
  let best: number | null = null;
  for (const name of [player.name, ...(player.formerNames ?? [])]) {
    const n = normalizeName(name);
    if (!n) continue;
    let score: number | null = null;
    if (n === w) score = 0;
    else {
      const d = distance(w, n);
      if (d <= (Math.min(w.length, n.length) >= 5 ? 2 : 1)) score = d;
      else if (w.length >= 2 && (n.startsWith(w) || w.startsWith(n))) score = 3;
    }
    if (score !== null && (best === null || score < best)) best = score;
  }
  return best;
}

/** The roster id for each written name, or null where none fits clearly. */
export function matchNames(
  written: string[],
  roster: Pick<RosterPlayer, "id" | "name" | "formerNames">[],
): (string | null)[] {
  const pairs: { column: number; id: string; score: number }[] = [];
  written.forEach((name, column) => {
    for (const player of roster) {
      const score = fit(name, player);
      if (score !== null) pairs.push({ column, id: player.id, score });
    }
  });
  // Best fits first; a tie for one column between two players is left to the people at the table.
  pairs.sort((a, b) => a.score - b.score);
  const result: (string | null)[] = written.map(() => null);
  const taken = new Set<string>();
  const decided = new Set<number>();
  for (const pair of pairs) {
    if (decided.has(pair.column) || taken.has(pair.id)) continue;
    const rival = pairs.some(
      (p) => p.column === pair.column && p.id !== pair.id && p.score === pair.score && !taken.has(p.id),
    );
    decided.add(pair.column);
    if (rival) continue;
    result[pair.column] = pair.id;
    taken.add(pair.id);
  }
  return result;
}

/** The roster with exactly these names selected, in this seating order, as the lobby would leave it. */
export function seatRoster(roster: RosterPlayer[], names: string[]): RosterPlayer[] {
  const seat = new Map(names.map((n, i) => [n.trim().toLowerCase(), i + 1]));
  return roster.map((p) => {
    const order = seat.get(p.name.trim().toLowerCase());
    return order ? { ...p, active: true, selectionOrder: order } : { ...p, active: false, selectionOrder: null };
  });
}
