"use client";

import { formatDuration } from "@/lib/utils";
import { useFlip7MatchHistory } from "./hooks/useFlip7MatchHistory";
import { Flip7GamemodeKey } from "./types";

const MEDALS = ["🥇", "🥈", "🥉"];

type Flip7GamemodeStatsProps = {
  gamemode: Flip7GamemodeKey;
};

type Totals = {
  games: number;
  wins: number;
  rounds: number;
  flip7s: number;
  busts: number;
};

const emptyTotals = (): Totals => ({
  games: 0,
  wins: 0,
  rounds: 0,
  flip7s: 0,
  busts: 0,
});

export function Flip7GamemodeStats({ gamemode }: Flip7GamemodeStatsProps) {
  const history = useFlip7MatchHistory();
  const matches = history.filter((match) => match.gamemode === gamemode);

  const gamesPlayed = matches.length;
  let highscore: { name: string; score: number } | null = null;
  let bestRound: { name: string; score: number } | null = null;
  const byPlayer = new Map<string, Totals>();

  const totalsFor = (name: string) => {
    const existing = byPlayer.get(name);
    if (existing) return existing;
    const created = emptyTotals();
    byPlayer.set(name, created);
    return created;
  };

  for (const match of matches) {
    if (match.players.length === 0) continue;
    const winner = [...match.players].sort((a, b) => b.score - a.score)[0];
    totalsFor(winner.name).wins += 1;

    for (const player of match.players) {
      const totals = totalsFor(player.name);
      totals.games += 1;
      totals.rounds += player.roundsPlayed;
      totals.flip7s += player.flip7s;
      totals.busts += player.busts;

      if (!highscore || player.score > highscore.score) {
        highscore = { name: player.name, score: player.score };
      }
      if (!bestRound || player.bestRound > bestRound.score) {
        bestRound = { name: player.name, score: player.bestRound };
      }
    }
  }

  const durations = matches
    .map((match) => match.durationMs)
    .filter((duration): duration is number => typeof duration === "number");
  const averageDurationMs =
    durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) /
        durations.length
      : null;

  const entries = [...byPlayer.entries()];

  const topWinners = entries
    .map(([name, totals]) => ({
      name,
      games: totals.games,
      wins: totals.wins,
      winRate: totals.wins / totals.games,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
    .slice(0, 3);

  const topFlippers = entries
    .filter(([, totals]) => totals.rounds > 0)
    .map(([name, totals]) => ({
      name,
      rounds: totals.rounds,
      flip7s: totals.flip7s,
      rate: totals.flip7s / totals.rounds,
    }))
    .filter((player) => player.flip7s > 0)
    .sort((a, b) => b.rate - a.rate || b.flip7s - a.flip7s)
    .slice(0, 3);

  // Fewest busts wins here, so the medals go to the ascending end.
  const safestPlayers = entries
    .filter(([, totals]) => totals.rounds > 0)
    .map(([name, totals]) => ({
      name,
      rounds: totals.rounds,
      busts: totals.busts,
      rate: totals.busts / totals.rounds,
    }))
    .sort((a, b) => a.rate - b.rate || a.busts - b.busts)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Statistiken
      </h2>
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-4">
        {gamesPlayed === 0 || !highscore ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Spiele in diesem Modus.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Gespielte Spiele
                </p>
                <p className="text-xl font-bold">{gamesPlayed}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Highscore
                </p>
                <p className="text-xl font-bold text-brand-accent">
                  {highscore.score} · {highscore.name}
                </p>
              </div>
              {bestRound && bestRound.score > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Beste Runde
                  </p>
                  <p className="text-xl font-bold">
                    {bestRound.score} · {bestRound.name}
                  </p>
                </div>
              )}
              {averageDurationMs !== null && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Ø Spielzeit
                  </p>
                  <p className="text-xl font-bold">
                    {formatDuration(averageDurationMs)}
                  </p>
                </div>
              )}
            </div>

            {topWinners.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Siegquote
                </p>
                {topWinners.map(({ name, wins, games, winRate }, index) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="font-bold">
                      {MEDALS[index]} {name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(winRate * 100)} % · {wins}/{games}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {topFlippers.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Flip-7-Quote
                </p>
                {topFlippers.map(({ name, flip7s, rounds, rate }, index) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="font-bold">
                      {MEDALS[index]} {name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(rate * 100)} % · {flip7s}/{rounds}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {safestPlayers.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Verzock-Quote (weniger ist besser)
                </p>
                {safestPlayers.map(({ name, busts, rounds, rate }, index) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="font-bold">
                      {MEDALS[index]} {name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(rate * 100)} % · {busts}/{rounds}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
