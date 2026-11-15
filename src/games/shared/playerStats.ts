import type { MatchPlayer, StoredMatch } from "./types";

/**
 * Per-player numbers for the statistics page (/statistik): one person across
 * a game's history, compared by name like every other statistic here.
 */

const key = (name: string) => name.trim().toLowerCase();

export type KnownPlayer = { name: string; emoji?: string; games: number };

/** Everyone in the history, most games first; the newest match decides the character. */
export function knownPlayers(matches: StoredMatch<MatchPlayer>[]): KnownPlayer[] {
  const byName = new Map<string, KnownPlayer & { last: string }>();
  for (const match of matches) {
    for (const player of match.players) {
      const entry = byName.get(key(player.name));
      if (!entry) {
        byName.set(key(player.name), { name: player.name, emoji: player.emoji, games: 1, last: match.timestamp });
        continue;
      }
      entry.games += 1;
      if (match.timestamp > entry.last) {
        entry.last = match.timestamp;
        entry.name = player.name;
        if (player.emoji) entry.emoji = player.emoji;
      }
    }
  }
  return [...byName.values()]
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name, "de"))
    .map(({ name, emoji, games }) => ({ name, ...(emoji ? { emoji } : {}), games }));
}

export type PlayerSummary = {
  games: number;
  /** Matches with at least two players in which this player had the best score (ties count for all). */
  wins: number;
  /** Matches with at least two players — what the win rate is out of. */
  contested: number;
  highscore: number | null;
  average: number | null;
  /** Last ten scores, oldest first. */
  recent: number[];
};

const better = (a: number, b: number, lowerIsBetter: boolean) => (lowerIsBetter ? a < b : a > b);

export function playerSummary(
  name: string,
  matches: StoredMatch<MatchPlayer>[],
  lowerIsBetter = false,
): PlayerSummary {
  const own = [...matches]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .flatMap((match) => {
      const me = match.players.find((p) => key(p.name) === key(name));
      return me ? [{ match, score: me.score }] : [];
    });

  let wins = 0;
  let contested = 0;
  for (const { match, score } of own) {
    if (match.players.length < 2) continue;
    contested += 1;
    if (!match.players.some((p) => better(p.score, score, lowerIsBetter))) wins += 1;
  }
  const scores = own.map((entry) => entry.score);
  return {
    games: own.length,
    wins,
    contested,
    highscore: scores.length === 0 ? null : lowerIsBetter ? Math.min(...scores) : Math.max(...scores),
    average: scores.length === 0 ? null : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    recent: scores.slice(-10),
  };
}

/** How often `name` beat `other` in the matches both played; ties count for neither. */
export function headToHead(
  name: string,
  other: string,
  matches: StoredMatch<MatchPlayer>[],
  lowerIsBetter = false,
): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;
  for (const match of matches) {
    const me = match.players.find((p) => key(p.name) === key(name));
    const them = match.players.find((p) => key(p.name) === key(other));
    if (!me || !them || me === them) continue;
    if (better(me.score, them.score, lowerIsBetter)) wins += 1;
    else if (better(them.score, me.score, lowerIsBetter)) losses += 1;
  }
  return { wins, losses };
}

/** "40 %" — the win rate as the statistics page shows it, or "–" without contested games. */
export const formatRate = (summary: Pick<PlayerSummary, "wins" | "contested">) =>
  summary.contested === 0 ? "–" : `${Math.round((summary.wins / summary.contested) * 100)} %`;
