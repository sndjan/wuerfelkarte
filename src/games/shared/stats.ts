import { MatchPlayer, StoredMatch } from "./types";

/** Wins and appearances per player name, across a set of matches. */
export type WinTally = { name: string; games: number; wins: number };

type TallyOptions = {
  /**
   * Matches with fewer players than this do not count toward the ranking —
   * Yatzy ignores solo games, where there is nobody to beat.
   */
  minPlayers?: number;
};

export function tallyWins<TMatch extends StoredMatch<MatchPlayer>>(
  matches: TMatch[],
  { minPlayers = 1 }: TallyOptions = {},
): Map<string, WinTally> {
  const tally = new Map<string, WinTally>();

  const entryFor = (name: string): WinTally => {
    const existing = tally.get(name);
    if (existing) return existing;
    const created = { name, games: 0, wins: 0 };
    tally.set(name, created);
    return created;
  };

  for (const match of matches) {
    if (match.players.length < Math.max(1, minPlayers)) continue;

    const winner = [...match.players].sort((a, b) => b.score - a.score)[0];
    entryFor(winner.name).wins += 1;

    for (const player of match.players) entryFor(player.name).games += 1;
  }

  return tally;
}

/** Sums a per-player number over every match a player appears in. */
export function sumByPlayer<TPlayer extends MatchPlayer>(
  matches: Array<StoredMatch<TPlayer>>,
  value: (player: TPlayer) => number,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const match of matches) {
    for (const player of match.players) {
      totals.set(player.name, (totals.get(player.name) ?? 0) + value(player));
    }
  }
  return totals;
}

/** The "63 % · 12/19" detail every ranking row uses. */
export const rateDetail = (hits: number, of: number): string =>
  `${Math.round((of === 0 ? 0 : hits / of) * 100)} % · ${hits}/${of}`;

/** Highest-rate-first top three; ties broken by the raw count. */
export function topThree<T extends { rate: number; count: number }>(
  rows: T[],
  order: "desc" | "asc" = "desc",
): T[] {
  const sorted = [...rows].sort((a, b) =>
    order === "desc"
      ? b.rate - a.rate || b.count - a.count
      : a.rate - b.rate || a.count - b.count,
  );
  return sorted.slice(0, 3);
}
