/**
 * Spots a skipped entry on the Würfelkarte. Players enter in seating order,
 * one field per turn, so the counts of filled fields never rise along the
 * table and differ by at most one. A player behind someone seated after
 * them, or two behind the leader, has missed an entry.
 *
 * Returns, per player, how many entries they are missing (0 for most).
 */
export function missingEntries(counts: number[]): number[] {
  if (counts.length === 0) return [];
  const max = Math.max(...counts);
  // The last player who already has the most entries: everyone before them should too.
  const lastLeader = counts.lastIndexOf(max);
  return counts.map((count, i) => Math.max(0, i < lastLeader ? max - count : max - 1 - count));
}
