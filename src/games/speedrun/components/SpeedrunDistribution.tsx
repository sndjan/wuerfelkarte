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
  type TimeCounts,
} from "../distribution";

type State =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "ready"; counts: TimeCounts; included: boolean };

/**
 * Everyone's Wertungszeit on the day, the player's own bar highlighted.
 * Sends the queued run first; left out when the backend cannot be reached.
 */
export function SpeedrunDistribution({ date, wertungMs }: { date: string; wertungMs: number }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const seconds = Math.floor(wertungMs / 1000);

  useEffect(() => {
    let cancelled = false;
    flushSubmission()
      .then(() => fetchDistribution(date))
      .then((counts) => {
        if (cancelled) return;
        setState(counts ? { status: "ready", counts, included: isSubmitted(date) } : { status: "hidden" });
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (state.status === "hidden") return null;

  const bars = state.status === "ready" ? bucketCounts(state.counts) : BUCKET_STARTS.map(() => 0);
  const highest = Math.max(1, ...bars);
  const own = bucketIndex(seconds);
  const players = bars.reduce((a, b) => a + b, 0);
  const rank = state.status === "ready" ? standing(state.counts, seconds, state.included) : null;

  return (
    <Card className="gap-3 p-4">
      <div>
        <p className="font-semibold">So lief der Tagesrun für alle</p>
        {rank === null ? (
          <div className="mt-1 h-4 w-40 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {rank.others === 0 ? "Noch ist niemand sonst gelaufen." : `Schneller als ${rank.fasterThan} % der Spieler.`}
          </p>
        )}
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {bars.map((count, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            {state.status === "ready" && (
              <span className={cn("text-[10px] tabular-nums text-muted-foreground", i === own && "font-bold text-foreground")}>
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
              style={state.status === "ready" ? { height: `${Math.max(4, (count / highest) * 100)}%` } : undefined}
            />
          </div>
        ))}
      </div>
      <div className="-mt-1 flex gap-1.5">
        {bars.map((_, i) => (
          <span
            key={i}
            className={cn("flex-1 text-center text-[10px] tabular-nums text-muted-foreground", i === own && "font-bold text-foreground")}
          >
            {bucketLabel(i)}
          </span>
        ))}
      </div>
      {state.status === "ready" && (
        <p className="text-xs text-muted-foreground">
          {players} {players === 1 ? "Ergebnis" : "Ergebnisse"} · anonym · weniger ist besser
        </p>
      )}
    </Card>
  );
}
