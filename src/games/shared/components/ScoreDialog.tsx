"use client";

import { useState, type ReactNode } from "react";

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
}: ScoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        {/* Mounted only while open, so every opening replays the reveal. */}
        <ScoreDialogBody
          players={players}
          shareConfig={shareConfig}
          subtitle={subtitle}
          elapsedMs={elapsedMs}
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
}: Pick<
  ScoreDialogProps,
  "players" | "shareConfig" | "subtitle" | "elapsedMs"
>) {
  const [revealing, setRevealing] = useState(true);

  const details =
    subtitle ??
    (typeof elapsedMs === "number" ? (
      <>⏱ Spielzeit: {formatDuration(elapsedMs)}</>
    ) : (
      "Siehe wer gewonnen hat"
    ));

  return (
    <>
      <DialogHeader>
        <DialogTitle>Punkteauswertung</DialogTitle>
      </DialogHeader>
      <DialogDescription>{revealing ? "Läuft…" : details}</DialogDescription>
      <div className="mt-2">
        <ScoreDiagram players={players} onRevealingChange={setRevealing} />
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        <ShareResult players={players} config={shareConfig} />
      </div>
    </>
  );
}
