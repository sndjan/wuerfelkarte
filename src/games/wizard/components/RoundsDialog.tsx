"use client";

import { Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deckSize, minAllowedRounds, suggestedRounds } from "../scoring";
import { WizardGame } from "../types";

interface RoundsDialogProps {
  game: WizardGame;
  onSetRoundCount: (next: number) => void;
  children: React.ReactNode;
}

export function RoundsDialog({
  game,
  onSetRoundCount,
  children,
}: RoundsDialogProps) {
  const min = minAllowedRounds(game);
  const cards = deckSize(game.specialCards);
  const max = Math.max(min, suggestedRounds(game.players.length, cards));

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] top-50">
        <DialogHeader>
          <DialogTitle>Rundenanzahl</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Mit {game.players.length} Spielern sind maximal {max} Runden
          möglich ({cards} Karten im Deck). Bereits gespielte Runden bleiben
          erhalten — minimal {min}.
        </DialogDescription>
        <div className="flex items-center justify-center gap-6 py-2">
          <button
            type="button"
            aria-label="Weniger Runden"
            disabled={game.totalRounds <= min}
            onClick={() => onSetRoundCount(game.totalRounds - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
          >
            <Minus size={18} />
          </button>
          <span className="text-3xl font-bold tabular-nums">
            {game.totalRounds}
          </span>
          <button
            type="button"
            aria-label="Mehr Runden"
            disabled={game.totalRounds >= max}
            onClick={() => onSetRoundCount(game.totalRounds + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
