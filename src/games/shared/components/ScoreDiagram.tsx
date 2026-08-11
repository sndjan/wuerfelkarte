"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { ScoredPlayer } from "../types";

/** How long the whole reveal takes, whatever the winning score is. */
const REVEAL_MS = 5000;

/** A bar's colour once it has arrived: gold, silver, bronze, then the field. */
const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const NEUTRAL_COLOR = "#9CA3AF";
/** While a bar is still counting up it stays in the app's accent green. */
const RUNNING_COLOR = "var(--brand-accent)";

type ScoreDiagramProps = {
  players: ScoredPlayer[];
  /** Lets the dialog say "Läuft…" while the bars are still filling. */
  onRevealingChange?: (revealing: boolean) => void;
  /** Golf-scored games (Cabo, …) win with the lowest total instead of the highest. */
  lowerIsBetter?: boolean;
};

/**
 * The animated scoreboard in every game's result dialog. All bars count up
 * towards their own score, so the worst ones lock in first — taking their
 * place's colour and revealing their player as they arrive — and the winner's
 * bar is the last one still growing.
 *
 * The pace comes from the top score, which makes the reveal take REVEAL_MS from
 * zero to winner — for a 300-point Wizard game as much as a 45-point Yatzy one.
 *
 * A lowerIsBetter game can't use that same magnitude-based pace: the winner
 * there often sits at or near 0, which would leave its bar static and empty
 * for the whole reveal — a long dead wait rather than something to watch. It
 * gets an even time-slice per player instead (worst score first, winner
 * last), each one counting its own bar up from 0 during its slot, so there is
 * always visible motion somewhere on screen.
 */
export function ScoreDiagram({
  players,
  onRevealingChange,
  lowerIsBetter = false,
}: ScoreDiagramProps) {
  const scores = players.map((player) => player.score);
  const topScore = scores.length > 0 ? Math.max(...scores) : 0;
  /** Bar widths and the count-up pace; never zero, so all-zero games still run. */
  const scale = Math.max(topScore, 1);

  // Tied players share a place, and the next distinct score takes the one after
  // it — the same ranking the shared result text uses.
  const places = Array.from(new Set(scores)).sort((a, b) =>
    lowerIsBetter ? a - b : b - a,
  );

  /** The count-up front, in points: every player is shown at most this much. */
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / REVEAL_MS);
      setRevealed(progress * scale);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    setRevealed(0);
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [scale]);

  const rows = (
    lowerIsBetter
      ? // Worst (highest score) first, winner last, each in its own equal
        // slice of the shared clock.
        [...players]
          .sort((a, b) => b.score - a.score)
          .map((player, rank, order) => {
            const slotStart = (rank / order.length) * scale;
            const slotEnd = ((rank + 1) / order.length) * scale;
            const span = slotEnd - slotStart;
            const progress =
              span <= 0 ? 1 : Math.min(1, Math.max(0, (revealed - slotStart) / span));
            return {
              player,
              shown: Math.round(progress * player.score),
              arrived: revealed >= slotEnd,
            };
          })
      : players.map((player) => {
          // Negative totals are behind the front from the start; the bar
          // itself cannot go below zero width. A score of 0 is the worst a
          // higher-is-better game can show, so it is meant to arrive at once.
          const shown = Math.min(Math.round(revealed), player.score);
          return { player, shown, arrived: revealed >= player.score };
        })
  ).sort((a, b) =>
    lowerIsBetter ? a.player.score - b.player.score : b.player.score - a.player.score,
  );

  const revealing = rows.some((row) => !row.arrived);
  useEffect(() => {
    onRevealingChange?.(revealing);
  }, [revealing, onRevealingChange]);

  return (
    <div className="space-y-3">
      {rows.map(({ player, shown, arrived }) => {
        const place = places.indexOf(player.score);

        return (
          <div key={player.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              {/* Who the bar belongs to stays secret until it has arrived. */}
              <span
                aria-hidden={!arrived}
                className={cn(
                  "truncate text-sm font-bold transition-opacity",
                  arrived ? "opacity-100" : "opacity-0",
                )}
              >
                {player.emoji ? `${player.emoji} ` : ""}
                {player.name}
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                {shown}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-colors"
                style={{
                  width: `${(Math.max(shown, 0) / scale) * 100}%`,
                  backgroundColor: arrived
                    ? (RANK_COLORS[place] ?? NEUTRAL_COLOR)
                    : RUNNING_COLOR,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
