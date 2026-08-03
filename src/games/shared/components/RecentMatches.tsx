"use client";

import type { ReactNode } from "react";

import { MatchPlayer, StoredMatch } from "../types";

const MAX_MATCHES = 5;

const formatShortDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return `${date.getDate()}.${date.getMonth() + 1}.`;
};

type RecentMatchesProps<TMatch extends StoredMatch<MatchPlayer>> = {
  matches: TMatch[];
  /** The mode's display name — the key stored on the match is the raw one. */
  modeName: (match: TMatch) => string;
  /** Optional chip after the mode name: Wizard's ±1, Flip 7's target score. */
  badge?: (match: TMatch) => ReactNode;
};

/** The "Letzte Spiele" list under every lobby, newest first. */
export function RecentMatches<TMatch extends StoredMatch<MatchPlayer>>({
  matches,
  modeName,
  badge,
}: RecentMatchesProps<TMatch>) {
  const recent = [...matches]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, MAX_MATCHES);

  if (recent.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Letzte Spiele
      </h2>
      {recent.map((match) => {
        const winner = [...match.players].sort((a, b) => b.score - a.score)[0];
        return (
          <div
            key={match.id}
            className="flex items-center justify-between gap-2 rounded-2xl bg-card p-4"
          >
            <div className="min-w-0">
              <p className="font-bold">
                {modeName(match)} · {formatShortDate(match.timestamp)}
                {badge?.(match)}
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

/** The chip shape both games use for their extra bit of match metadata. */
export function MatchBadge({ children }: { children: ReactNode }) {
  return (
    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
      {children}
    </span>
  );
}
