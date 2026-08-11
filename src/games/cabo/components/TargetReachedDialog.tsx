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
  /** The player whose total just went past the target — usually not the winner. */
  overName: string;
  overScore: number;
  /** Whoever currently has the fewest points — who wins if the group stops now. */
  leaderName: string;
  leaderScore: number;
  /** Ends the partie and opens the scorecard — the result is shown there. */
  onShowScores: () => void;
  onContinue: () => void;
}

export function TargetReachedDialog({
  open,
  onOpenChange,
  targetScore,
  overName,
  overScore,
  leaderName,
  leaderScore,
  onShowScores,
  onContinue,
}: TargetReachedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ziel überschritten!</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {overName} hat mit {overScore} Punkten mehr als {targetScore}.{" "}
          {leaderName === overName
            ? `${leaderName} hätte trotzdem mit ${leaderScore} Punkten die wenigsten.`
            : `Aktuell führt ${leaderName} mit ${leaderScore} Punkten.`}
        </DialogDescription>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button type="button" onClick={onShowScores}>
            🏆 Punkteauswertung
          </Button>
          <Button type="button" variant="outline" onClick={onContinue}>
            Weiterspielen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
