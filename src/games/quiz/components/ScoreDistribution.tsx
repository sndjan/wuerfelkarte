"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BUCKET_STARTS,
  bucketCounts,
  bucketIndex,
  bucketLabel,
  fetchDistribution,
  flushSubmission,
  isSubmitted,
  standing,
  type ScoreCounts,
} from "../distribution";
import { POINTS_PERFECT, PUZZLES_PER_DAY } from "../puzzles";

type ScoreDistributionProps = {
  date: string;
  total: number;
};

type State =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "ready"; counts: ScoreCounts; included: boolean };

function headline(counts: ScoreCounts, total: number, included: boolean): string {
  const { others, betterThan, sameAs } = standing(counts, total, included);
  if (others === 0) return "Noch hat niemand sonst gespielt.";
  if (total === PUZZLES_PER_DAY * POINTS_PERFECT) {
    return sameAs === 0 ? "Perfekt – das hat sonst noch niemand geschafft." : `Perfekt – wie ${sameAs} % der Spieler.`;
  }
  return `Besser als ${betterThan} % der Spieler.`;
}

/**
 * How everyone did on the day, with the player's own bar highlighted. Sends
 * today's queued result first, so it is part of the picture; left out
 * entirely when the backend cannot be reached.
 */
export function ScoreDistribution({ date, total }: ScoreDistributionProps) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    flushSubmission()
      .then(() => fetchDistribution(date))
      .then((counts) => {
        if (cancelled) return;
        setState(
          counts ? { status: "ready", counts, included: isSubmitted(date) } : { status: "hidden" },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (state.status === "hidden") return null;

  const bars = state.status === "ready" ? bucketCounts(state.counts) : BUCKET_STARTS.map(() => 0);
  const highest = Math.max(1, ...bars);
  const own = bucketIndex(total);
  const players = bars.reduce((a, b) => a + b, 0);

  return (
    <Card className="gap-3 p-4">
      <div>
        <p className="font-semibold">So lief es für alle</p>
        {state.status === "loading" ? (
          <div className="mt-1 h-4 w-40 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {headline(state.counts, total, state.included)}
          </p>
        )}
      </div>

      <div className="flex h-28 items-end gap-1.5" aria-hidden={state.status === "loading"}>
        {bars.map((count, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            {state.status === "ready" && (
              <span
                className={cn(
                  "text-[10px] tabular-nums text-muted-foreground",
                  i === own && "font-bold text-foreground",
                )}
              >
                {count}
              </span>
            )}
            <div
              className={cn(
                "w-full rounded-t-sm transition-[height] duration-500",
                state.status === "loading"
                  ? "h-1/3 animate-pulse bg-muted"
                  : i === own
                    ? "bg-primary"
                    : "bg-muted-foreground/25",
              )}
              style={
                state.status === "ready"
                  ? { height: `${Math.max(4, (count / highest) * 100)}%` }
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      <div className="-mt-1 flex gap-1.5">
        {bars.map((_, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 text-center text-[10px] tabular-nums text-muted-foreground",
              i === own && "font-bold text-foreground",
            )}
          >
            {bucketLabel(i)}
          </span>
        ))}
      </div>

      {state.status === "ready" && (
        <p className="text-xs text-muted-foreground">
          {players} {players === 1 ? "Ergebnis" : "Ergebnisse"} · anonym
        </p>
      )}
    </Card>
  );
}
