"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/utils";
import { ScoredPlayer } from "../types";
import { ScoreDiagram } from "./ScoreDiagram";
import { ShareConfig, ShareResult } from "./ShareResult";

type ScoreDialogProps = {
  players: ScoredPlayer[];
  shareConfig: ShareConfig;
  /** Extra line under the description, e.g. Flip 7's target and round count. */
  subtitle?: ReactNode;
  elapsedMs?: number | null;
  /** Uncontrolled use: the element that opens the dialog. */
  trigger?: ReactNode;
  /** Controlled use: Flip 7 opens the same dialog from three places. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** „Neues Spiel“: same players, empty sheet. Left out where a game has no such reset. */
  onNewGame?: () => void;
};

/** The end-of-game scorecard, identical in every game. */
export function ScoreDialog({
  players,
  shareConfig,
  subtitle,
  elapsedMs,
  trigger,
  open,
  onOpenChange,
  onNewGame,
}: ScoreDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {/* A sheet from below rather than a box in the middle: the card stays in view above it. */}
      <DialogContent variant="sheet">
        {/* Mounted only while open, so every opening replays the reveal. */}
        <ScoreDialogBody
          players={players}
          shareConfig={shareConfig}
          subtitle={subtitle}
          elapsedMs={elapsedMs}
          onClose={() => setOpen(false)}
          onNewGame={
            onNewGame
              ? () => {
                  setOpen(false);
                  onNewGame();
                }
              : undefined
          }
        />
      </DialogContent>
    </Dialog>
  );
}

function ScoreDialogBody({
  players,
  shareConfig,
  subtitle,
  elapsedMs,
  onClose,
  onNewGame,
}: Pick<ScoreDialogProps, "players" | "shareConfig" | "subtitle" | "elapsedMs" | "onNewGame"> & {
  onClose: () => void;
}) {
  const [revealing, setRevealing] = useState(true);
  const [run, setRun] = useState(0);
  const ranked = [...players].sort((a, b) => (shareConfig.lowerIsBetter ? a.score - b.score : b.score - a.score));
  const winner = ranked[0];
  const details =
    subtitle ??
    [
      winner ? `${winner.name} gewinnt mit ${winner.score} Punkten` : null,
      typeof elapsedMs === "number" ? `Spielzeit ${formatDuration(elapsedMs)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  return (
    <>
      <div className="flex items-center gap-3">
        <DialogHeader className="min-w-0 flex-1 gap-0 text-left sm:text-left">
          <DialogTitle>Auswertung</DialogTitle>
          <DialogDescription aria-live="polite" className="text-sm text-ink-muted">
            {revealing ? "Die Punkte laufen. Wer zuerst stehen bleibt, liegt hinten." : details}
          </DialogDescription>
        </DialogHeader>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="mr-8 size-11 shrink-0"
          aria-label="Nochmal abspielen"
          onClick={() => setRun((n) => n + 1)}
        >
          <RotateCcw />
        </Button>
      </div>
      <ScoreDiagram
        key={run}
        players={players}
        onRevealingChange={setRevealing}
        lowerIsBetter={shareConfig.lowerIsBetter}
      />
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            <ChevronDown /> Zur Karte
          </Button>
          <ShareResult players={players} config={shareConfig} />
        </div>
        {onNewGame && (
          <Button type="button" size="lg" className="w-full" onClick={onNewGame}>
            Neues Spiel
          </Button>
        )}
      </div>
    </>
  );
}
