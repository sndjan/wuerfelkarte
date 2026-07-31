import AnimatedScoreDiagram from "./AnimatedScoreDiagram";
import { gamemodes } from "./gamemodes/gamemodes";
import { Player } from "./hooks/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Share } from "./Share";
import { formatDuration } from "@/lib/utils";

interface ScoringProps {
  players: Player[];
  gamemode: keyof typeof gamemodes;
  elapsedMs?: number | null;
  children: React.ReactNode;
}

export function Scoring({
  players,
  gamemode,
  elapsedMs,
  children,
}: ScoringProps) {
  const saveMatchLocally = () => {
    // Check if any player has a non-zero score
    const hasValidScores = players.some((p) => p.score > 0);
    if (!hasValidScores) {
      return;
    }

    const lastMatches = localStorage.getItem("lastMatches");
    const lastMatchesData = lastMatches ? JSON.parse(lastMatches) : [];
    const lastMatchTime = lastMatchesData[lastMatchesData.length - 1]
      ?.timestamp
      ? new Date(
          lastMatchesData[lastMatchesData.length - 1].timestamp
        ).getTime()
      : 0;
    const now = Date.now();
    const timeDiffInSeconds = (now - lastMatchTime) / 1000;

    // Don't save if last match was saved within the last 2 minutes
    if (timeDiffInSeconds < 120) {
      return;
    }

    const newMatch = {
      players,
      gamemode,
      timestamp: new Date().toISOString(),
      ...(typeof elapsedMs === "number" ? { durationMs: elapsedMs } : {}),
    };
    lastMatchesData.push(newMatch);

    localStorage.setItem("lastMatches", JSON.stringify(lastMatchesData));
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      saveMatchLocally();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
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
          <Share gamemode={gamemode} players={players} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
