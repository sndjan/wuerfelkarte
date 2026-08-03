"use client";
import { useEffect, useState } from "react";

type ScoredPlayer = {
  id: string;
  name: string;
  emoji?: string;
  score: number;
};

interface AnimatedScoreDiagramProps {
  players: ScoredPlayer[];
}

/** Counts every bar up at a fixed step; Flip7 totals run high, so it steps in 2s. */
const STEP = 2;

export function AnimatedScoreDiagram({ players }: AnimatedScoreDiagramProps) {
  const totalScores = players.map((player) => player.score);

  const [animatedScores, setAnimatedScores] = useState(
    totalScores.map(() => 0),
  );

  const maxScore = Math.max(...totalScores, 1);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedScores((prevScores) =>
        prevScores.map((score, index) =>
          score < totalScores[index]
            ? Math.min(score + STEP, totalScores[index])
            : totalScores[index],
        ),
      );
    }, 25);

    return () => clearInterval(interval);
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
          <div key={player.id} className="relative w-full h-10 rounded">
            <div
              className="absolute top-0 left-0 h-full rounded"
              style={{
                width: `${(Math.max(animatedScore, 0) / maxScore) * 100}%`,
                transition: "width 0.5s ease",
                backgroundColor:
                  index === 0
                    ? "#ffd700"
                    : index === 1
                      ? "#c0c0c0"
                      : index === 2
                        ? "#cd7f32"
                        : "#e5e5e5",
              }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-around dark:text-[#fafafa] text-[#0a0a0a] font-bold">
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

export default AnimatedScoreDiagram;
