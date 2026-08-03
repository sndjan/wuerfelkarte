"use client";

import { flip7Gamemodes } from "../gamemodes";
import { useMatchHistory } from "@/games/shared/hooks/useMatchHistory";
import { flip7Storage } from "../storage";

const MAX_MATCHES = 5;

function formatShortDate(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

export function RecentMatchesList() {
  const history = useMatchHistory(flip7Storage.loadMatches);

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
      {matches.map((match) => {
        const winner = [...match.players].sort((a, b) => b.score - a.score)[0];
        const modeName = flip7Gamemodes[match.gamemode]?.name ?? match.gamemode;
        return (
          <div
            key={match.id}
            className="flex items-center justify-between gap-2 rounded-2xl bg-card p-4"
          >
            <div className="min-w-0">
              <p className="font-bold">
                {modeName} · {formatShortDate(match.timestamp)}
                <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                  {match.targetScore}
                </span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {match.players.map((p) => p.name).join(", ")}
              </p>
            </div>
            {winner && (
              <p className="shrink-0 font-bold text-brand-accent">
                🏆 {winner.name} · {winner.score}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
