"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { MatchPlayer, StoredMatch } from "../types";

const MAX_MATCHES = 5;

const formatShortDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return `${date.getDate()}.${date.getMonth() + 1}.`;
};

export type MatchAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

type RecentMatchesProps<TMatch extends StoredMatch<MatchPlayer>> = {
  matches: TMatch[];
  /** The mode's display name — the key stored on the match is the raw one. */
  modeName: (match: TMatch) => string;
  /** Optional chip after the mode name: Wizard's ±1, Flip 7's target score. */
  badge?: (match: TMatch) => ReactNode;
  /** Per-row button before the winner; return null to omit it for that row. */
  action?: (match: TMatch) => MatchAction | null;
  /** Link to the cross-game history page; rendered top-right of the heading. */
  viewAllHref?: string;
  /** Golf-scored games (Cabo, …) win with the lowest total instead of the highest. */
  lowerIsBetter?: boolean;
};

/** The "Letzte Spiele" list under every lobby, newest first. */
export function RecentMatches<TMatch extends StoredMatch<MatchPlayer>>({
  matches,
  modeName,
  badge,
  action,
  viewAllHref,
  lowerIsBetter = false,
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
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Letzte Spiele
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm font-semibold text-brand-accent"
          >
            Alle Spiele
          </Link>
        )}
      </div>
      {recent.map((match) => {
        const winner = [...match.players].sort((a, b) =>
          lowerIsBetter ? a.score - b.score : b.score - a.score,
        )[0];
        const matchAction = action?.(match) ?? null;
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
            <div className="flex shrink-0 items-center gap-3">
              {matchAction && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={matchAction.onClick}
                >
                  <matchAction.icon className="size-4" />
                  {matchAction.label}
                </Button>
              )}
              {winner && (
                <p className="font-bold text-brand-accent">
                  🏆 {winner.name} · {winner.score}
                </p>
              )}
            </div>
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
