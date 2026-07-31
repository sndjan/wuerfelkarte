"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { useMatchHistory } from "@/components/hooks/useMatchHistory";
import { formatDuration } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

type GamemodeStatsProps = {
  gamemode: keyof typeof gamemodes;
};

export function GamemodeStats({ gamemode }: GamemodeStatsProps) {
  const history = useMatchHistory();
  const matches = history.filter((match) => match.gamemode === gamemode);

  const gamesPlayed = matches.length;
  let highscore: { name: string; score: number } | null = null;
  const wins = new Map<string, number>();
  const played = new Map<string, number>();

  for (const match of matches) {
    if (match.players.length === 0) continue;
    const winner = [...match.players].sort((a, b) => b.score - a.score)[0];
    wins.set(winner.name, (wins.get(winner.name) ?? 0) + 1);

    for (const player of match.players) {
      played.set(player.name, (played.get(player.name) ?? 0) + 1);
      if (!highscore || player.score > highscore.score) {
        highscore = { name: player.name, score: player.score };
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

  const topWinners = [...played.entries()]
    .map(([name, gamesPlayedByPlayer]) => ({
      name,
      gamesPlayedByPlayer,
      wins: wins.get(name) ?? 0,
      winRate: (wins.get(name) ?? 0) / gamesPlayedByPlayer,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
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
                {topWinners.map(({ name, wins, gamesPlayedByPlayer, winRate }, index) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="font-bold">
                      {MEDALS[index]} {name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(winRate * 100)} % · {wins}/{gamesPlayedByPlayer}
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
