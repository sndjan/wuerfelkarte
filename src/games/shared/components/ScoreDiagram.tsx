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
};

/**
 * The animated scoreboard in every game's result dialog. All bars count up at
 * the same points-per-second pace, so the lower scores lock in first — taking
 * their place's colour and revealing their player as they arrive — and the
 * leader's bar is the last one still growing.
 *
 * The pace comes from the top score, which makes the reveal take REVEAL_MS from
 * zero to winner — for a 300-point Wizard game as much as a 45-point Yatzy one.
 */
export function ScoreDiagram({
  players,
  onRevealingChange,
}: ScoreDiagramProps) {
  const scores = players.map((player) => player.score);
  const topScore = scores.length > 0 ? Math.max(...scores) : 0;
  /** Bar widths and the count-up pace; never zero, so all-zero games still run. */
  const scale = Math.max(topScore, 1);

  // Tied players share a place, and the next distinct score takes the one after
  // it — the same ranking the shared result text uses.
  const places = Array.from(new Set(scores)).sort((a, b) => b - a);

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

  const rows = players
    .map((player) => ({
      player,
      // Negative totals are behind the front from the start; the bar itself
      // cannot go below zero width.
      shown: Math.min(Math.round(revealed), player.score),
    }))
    .sort((a, b) => b.player.score - a.player.score);

  const revealing = rows.some((row) => row.shown < row.player.score);
  useEffect(() => {
    onRevealingChange?.(revealing);
  }, [revealing, onRevealingChange]);

  return (
    <div className="space-y-3">
      {rows.map(({ player, shown }) => {
        const place = places.indexOf(player.score);
        const arrived = shown >= player.score;

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
