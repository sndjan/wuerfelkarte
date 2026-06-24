"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { FTSettings } from "./hooks/useFreeTracking";

interface ScoringPlayer {
  id: number;
  name: string;
  score: number;
}

interface FreeTrackingScoringProps {
  players: ScoringPlayer[];
  settings: FTSettings;
  children: React.ReactNode;
}

const MEDAL_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"];

function FreeTrackingDiagram({
  players,
  settings,
}: {
  players: ScoringPlayer[];
  settings: FTSettings;
}) {
  const lowestWins = settings.winCondition === "lowest";

  const sorted = [...players].sort((a, b) =>
    lowestWins ? a.score - b.score : b.score - a.score
  );

  const totalScores = sorted.map((p) => p.score);
  const [animatedScores, setAnimatedScores] = useState(
    totalScores.map(() => 0)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedScores((prev) =>
        prev.map((anim, i) => {
          const target = totalScores[i];
          const step = Math.max(1, Math.ceil(Math.abs(target) / 60));
          if (anim < target) return Math.min(anim + step, target);
          if (anim > target) return Math.max(anim - step, target);
          return anim;
        })
      );
    }, 25);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scores = players.map((p) => p.score);
  const maxScore = players.length > 0 ? Math.max(...scores) : 0;
  const minScore = players.length > 0 ? Math.min(...scores) : 0;
  const range = maxScore - minScore;

  const getBarWidth = (animScore: number): number => {
    if (range === 0) return 50;
    const clamped = Math.max(minScore, Math.min(maxScore, animScore));
    return lowestWins
      ? ((maxScore - clamped) / range) * 100
      : ((clamped - minScore) / range) * 100;
  };

  return (
    <div className="space-y-2">
      {sorted.map((player, index) => {
        const animScore = animatedScores[index];
        return (
          <div key={player.id} className="relative w-full h-10 rounded">
            <div
              className="absolute top-0 left-0 h-full rounded"
              style={{
                width: `${Math.max(getBarWidth(animScore), 8)}%`,
                backgroundColor: MEDAL_COLORS[index] ?? "#e5e5e5",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-around dark:text-[#fafafa] text-[#0a0a0a] font-bold text-sm">
              <span>{animScore} Punkte</span>
              {animScore === player.score && <span>{player.name}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FreeTrackingScoring({
  players,
  settings,
  children,
}: FreeTrackingScoringProps) {
  const lowestWins = settings.winCondition === "lowest";

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Punkteauswertung</DialogTitle>
          <DialogDescription>
            {lowestWins
              ? "Niedrigster Punktestand gewinnt"
              : "Höchster Punktestand gewinnt"}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <FreeTrackingDiagram players={players} settings={settings} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
