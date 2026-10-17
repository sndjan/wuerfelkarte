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

export type LegTally = { name: string; emoji?: string; legs: number };

/** Announces the leg that was just won — and the match, when it was the last one. */
export function LegWonDialog({
  open,
  onOpenChange,
  legNumber,
  winnerName,
  winnerDarts,
  tally,
  matchDecided,
  onContinue,
  onShowScores,
  onRematch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  legNumber: number;
  winnerName: string;
  winnerDarts: number;
  tally: LegTally[];
  matchDecided: boolean;
  onContinue: () => void;
  onShowScores: () => void;
  onRematch: () => void;
}) {
  const tallyLine = tally
    .map((entry) => `${entry.name} ${entry.legs}`)
    .join(" · ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {matchDecided
              ? `🏆 ${winnerName} gewinnt die Partie`
              : `Leg ${legNumber} an ${winnerName}`}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {winnerDarts} Darts · {tallyLine}
        </DialogDescription>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {matchDecided ? (
            <>
              <Button type="button" onClick={onShowScores}>
                🏆 Punkteauswertung
              </Button>
              <Button type="button" variant="outline" onClick={onRematch}>
                Revanche
              </Button>
            </>
          ) : (
            <>
              <Button type="button" onClick={onContinue}>
                Nächstes Leg
              </Button>
              <Button type="button" variant="outline" onClick={onShowScores}>
                🏆 Zwischenstand
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
