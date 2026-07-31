"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { useMatchHistory } from "@/components/hooks/useMatchHistory";

const MAX_MATCHES = 5;

function formatShortDate(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

export function RecentMatchesList() {
  const history = useMatchHistory();

  const matches = [...history]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, MAX_MATCHES);

  if (matches.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Letzte Spiele
      </h2>
      {matches.map((match, index) => {
        const winner = [...match.players].sort((a, b) => b.score - a.score)[0];
        const modeName =
          gamemodes[match.gamemode as keyof typeof gamemodes]?.name ??
          match.gamemode;
        return (
          <div
            key={`${match.timestamp}-${index}`}
            className="flex items-center justify-between rounded-2xl bg-card p-4"
          >
            <div>
              <p className="font-bold">
                {modeName} · {formatShortDate(match.timestamp)}
              </p>
              <p className="text-sm text-muted-foreground">
                {match.players.map((p) => p.name).join(", ")}
              </p>
            </div>
            {winner && (
              <p className="font-bold text-brand-accent">
                🏆 {winner.name} · {winner.score}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
