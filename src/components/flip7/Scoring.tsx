import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/utils";
import { AnimatedScoreDiagram } from "./AnimatedScoreDiagram";
import { Share } from "./Share";
import { Flip7GamemodeKey } from "./types";

type ScoredPlayer = {
  id: string;
  name: string;
  emoji?: string;
  score: number;
};

/**
 * Controlled on purpose: the same scorecard is opened from the header, from the
 * finished round card and straight out of the "Ziel erreicht" prompt.
 */
interface ScoringProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: ScoredPlayer[];
  gamemode: Flip7GamemodeKey;
  targetScore: number;
  rounds: number;
  elapsedMs?: number | null;
}

export function Scoring({
  open,
  onOpenChange,
  players,
  gamemode,
  targetScore,
  rounds,
  elapsedMs,
}: ScoringProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Punkteauswertung</DialogTitle>
        </DialogHeader>
        <DialogDescription>Siehe wer gewonnen hat</DialogDescription>
        <p className="text-sm text-muted-foreground">
          🎯 Ziel: {targetScore} Punkte · {rounds}{" "}
          {rounds === 1 ? "Runde" : "Runden"}
          {typeof elapsedMs === "number" &&
            ` · ⏱ ${formatDuration(elapsedMs)}`}
        </p>
        <div className="mt-4">
          <AnimatedScoreDiagram players={players} />
        </div>
        <div className="mt-4 flex gap-2 justify-end items-center">
          <Share
            gamemode={gamemode}
            targetScore={targetScore}
            players={players}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
