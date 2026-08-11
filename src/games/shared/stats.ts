import { MatchPlayer, StoredMatch } from "./types";

export type PlayerStanding = {
  name: string;
  emoji?: string;
  games: number;
  wins: number;
  averageScore: number;
  /** Win rate smoothed against the random-chance baseline for each match's player count. */
  winRate: number;
};

export type StreakInfo = {
  name: string;
  emoji?: string;
  length: number;
  /** Still going as of the most recent match — nobody has beaten them since. */
  active: boolean;
};

export type GamemodeStatsSummary = {
  gamesPlayed: number;
  /**
   * Ranked by adjusted win rate (ties broken by raw win count). Solo matches
   * have no real winner, so they don't count towards this ranking.
   */
  standings: PlayerStanding[];
  highscore: { name: string; emoji?: string; score: number } | null;
  averageDurationMs: number | null;
  /** Average duration divided by the average number of players per match. */
  perPlayerDurationMs: number | null;
  bestAverage: { name: string; emoji?: string; average: number } | null;
  /** The longest win streak on record — current if still active, historical otherwise. */
  streak: StreakInfo | null;
};

const emptySummary: GamemodeStatsSummary = {
  gamesPlayed: 0,
  standings: [],
  highscore: null,
  averageDurationMs: null,
  perPlayerDurationMs: null,
  bestAverage: null,
  streak: null,
};

/** Everything the gamemode statistics view needs, derived from raw match history. */
export function buildGamemodeStatsSummary<TMatch extends StoredMatch<MatchPlayer>>(
  matches: TMatch[],
): GamemodeStatsSummary {
  if (matches.length === 0) return emptySummary;

  const chronological = [...matches].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const players = new Map<
    string,
    { emoji?: string; games: number; wins: number; totalScore: number; expectedWins: number }
  >();
  let highscore: { name: string; emoji?: string; score: number } | null = null;
  let totalPlayerSlots = 0;

  // Longest win streak per player, plus the streak currently in progress —
  // together these say whether the longest one on record is still running.
  const bestStreaks = new Map<string, number>();
  let runName: string | null = null;
  let runLength = 0;

  for (const match of chronological) {
    totalPlayerSlots += match.players.length;

    for (const player of match.players) {
      if (!highscore || player.score > highscore.score) {
        highscore = { name: player.name, emoji: player.emoji, score: player.score };
      }
    }

    // Solo-Partien haben keinen echten Sieger und zählen nicht fürs Ranking.
    if (match.players.length < 2) continue;

    const winner = [...match.players].sort((a, b) => b.score - a.score)[0];
    runLength = winner.name === runName ? runLength + 1 : 1;
    runName = winner.name;
    bestStreaks.set(runName, Math.max(bestStreaks.get(runName) ?? 0, runLength));

    // Erwartete Siege aus reinem Zufall: 1 / Spieleranzahl dieser Partie.
    const expectedShare = 1 / match.players.length;
    for (const player of match.players) {
      const entry = players.get(player.name) ?? {
        emoji: player.emoji,
        games: 0,
        wins: 0,
        totalScore: 0,
        expectedWins: 0,
      };
      entry.emoji = player.emoji ?? entry.emoji;
      entry.games += 1;
      entry.totalScore += player.score;
      entry.expectedWins += expectedShare;
      if (player.name === winner.name) entry.wins += 1;
      players.set(player.name, entry);
    }
  }

  // Bayesian-smoothed win rate: every player starts with C imaginary extra
  // games, won at exactly the rate random chance would predict for them.
  // Few real games barely move the needle away from that baseline; a long
  // track record drowns it out.
  const PRIOR_GAMES = 5;
  const adjustedWinRate = (wins: number, games: number, expectedWins: number) => {
    const baseline = games > 0 ? expectedWins / games : 0;
    return (wins + PRIOR_GAMES * baseline) / (games + PRIOR_GAMES);
  };

  const standings: PlayerStanding[] = [...players.entries()]
    .map(([name, { emoji, games, wins, totalScore, expectedWins }]) => ({
      name,
      emoji,
      games,
      wins,
      averageScore: totalScore / games,
      winRate: adjustedWinRate(wins, games, expectedWins),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

  const topAverage = standings.reduce<PlayerStanding | null>(
    (best, standing) =>
      !best || standing.averageScore > best.averageScore ? standing : best,
    null,
  );
  const bestAverage = topAverage && {
    name: topAverage.name,
    emoji: topAverage.emoji,
    average: topAverage.averageScore,
  };

  const durations = matches
    .map((match) => match.durationMs)
    .filter((duration): duration is number => typeof duration === "number");
  const averageDurationMs =
    durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : null;
  const averagePlayerCount = totalPlayerSlots / chronological.length;
  const perPlayerDurationMs =
    averageDurationMs !== null ? averageDurationMs / averagePlayerCount : null;

  // Prefer the active player on a tie — a streak still running beats one that
  // merely tied the record in the past.
  let bestStreakName: string | null = null;
  let bestStreakLength = 0;
  for (const [name, length] of bestStreaks) {
    if (length > bestStreakLength || (length === bestStreakLength && name === runName)) {
      bestStreakName = name;
      bestStreakLength = length;
    }
  }

  const streak: StreakInfo | null = bestStreakName
    ? {
        name: bestStreakName,
        emoji: players.get(bestStreakName)?.emoji,
        length: bestStreakLength,
        active: bestStreakName === runName && bestStreakLength === runLength,
      }
    : null;

  return {
    gamesPlayed: matches.length,
    standings,
    highscore,
    averageDurationMs,
    perPlayerDurationMs,
    bestAverage,
    streak,
  };
}
