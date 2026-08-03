import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/utils";
import { AnimatedScoreDiagram } from "./AnimatedScoreDiagram";
import { Share } from "./Share";
import { WizardGamemodeKey } from "../types";

type ScoredPlayer = {
  id: string;
  name: string;
  emoji?: string;
  score: number;
};

interface ScoringProps {
  players: ScoredPlayer[];
  gamemode: WizardGamemodeKey;
  plusMinusOne: boolean;
  elapsedMs?: number | null;
  children: React.ReactNode;
}

export function Scoring({
  players,
  gamemode,
  plusMinusOne,
  elapsedMs,
  children,
}: ScoringProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Punkteauswertung</DialogTitle>
        </DialogHeader>
        <DialogDescription>Siehe wer gewonnen hat</DialogDescription>
        {typeof elapsedMs === "number" && (
          <p className="text-sm text-muted-foreground">
            ⏱ Spielzeit: {formatDuration(elapsedMs)}
          </p>
        )}
        <div className="mt-4">
          <AnimatedScoreDiagram players={players} />
        </div>
        <div className="mt-4 flex gap-2 justify-end items-center">
          <Share gamemode={gamemode} plusMinusOne={plusMinusOne} players={players} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
