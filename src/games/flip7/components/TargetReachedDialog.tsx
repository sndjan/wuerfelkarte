"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TargetReachedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetScore: number;
  leaderName: string;
  leaderScore: number;
  /** Rulebook: a shared lead needs one more round to break it. */
  tied: boolean;
  /** Ends the partie and opens the scorecard — the result is shown there. */
  onShowScores: () => void;
  onContinue: () => void;
}

export function TargetReachedDialog({
  open,
  onOpenChange,
  targetScore,
  leaderName,
  leaderScore,
  tied,
  onShowScores,
  onContinue,
}: TargetReachedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {tied ? "Gleichstand an der Spitze" : "Ziel erreicht!"}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {tied
            ? `Mehrere Personen liegen mit ${leaderScore} Punkten vorn. Laut Anleitung entscheidet eine weitere Runde.`
            : `${leaderName} hat mit ${leaderScore} Punkten die ${targetScore} geknackt.`}
        </DialogDescription>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {tied ? (
            <>
              <Button type="button" onClick={onContinue}>
                Entscheidungsrunde spielen
              </Button>
              <Button type="button" variant="outline" onClick={onShowScores}>
                🏆 Punkteauswertung
              </Button>
            </>
          ) : (
            <>
              <Button type="button" onClick={onShowScores}>
                🏆 Punkteauswertung
              </Button>
              <Button type="button" variant="outline" onClick={onContinue}>
                Weiterspielen
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
