"use client";

import { useEffect, useState } from "react";

import { ScoredPlayer } from "../types";

/** Bar colours for the podium; everyone else shares the neutral one. */
const BAR_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"];
const NEUTRAL_BAR = "#e5e5e5";

const TICK_MS = 25;
/** Frames the count-up should take, whatever the score range. */
const TARGET_FRAMES = 60;

/**
 * The animated scoreboard in every game's result dialog: bars count up from
 * zero, and a player's name appears once their bar has arrived.
 *
 * The step is derived from the highest score, so a 300-point Wizard game and a
 * 45-point Yatzy game take about the same time to finish counting.
 */
export function ScoreDiagram({ players }: { players: ScoredPlayer[] }) {
  const totalScores = players.map((player) => player.score);
  const [animatedScores, setAnimatedScores] = useState(() =>
    totalScores.map(() => 0),
  );

  const maxScore = Math.max(...totalScores, 1);
  const step = Math.max(1, Math.ceil(maxScore / TARGET_FRAMES));

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedScores((prev) =>
        prev.map((score, index) =>
          score < totalScores[index]
            ? Math.min(score + step, totalScores[index])
            : totalScores[index],
        ),
      );
    }, TICK_MS);

    return () => clearInterval(interval);
    // Restarting on every score identity change would keep resetting the count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  return (
    <div className="space-y-2">
      {players
        .map((player, index) => ({
          player,
          score: totalScores[index],
          animatedScore: animatedScores[index] ?? 0,
        }))
        .sort((a, b) => b.score - a.score)
        .map(({ player, score, animatedScore }, index) => (
          <div key={player.id} className="relative h-10 w-full rounded">
            <div
              className="absolute left-0 top-0 h-full rounded"
              style={{
                // Negative totals snap straight to their value; the bar itself
                // cannot go below zero width.
                width: `${(Math.max(animatedScore, 0) / maxScore) * 100}%`,
                transition: "width 0.5s ease",
                backgroundColor: BAR_COLORS[index] ?? NEUTRAL_BAR,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-around font-bold text-[#0a0a0a] dark:text-[#fafafa]">
              <div>{animatedScore} Punkte</div>
              <div>
                {animatedScore === score && (
                  <span className="ml-2">
                    {player.emoji ? `${player.emoji} ` : ""}
                    {player.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
