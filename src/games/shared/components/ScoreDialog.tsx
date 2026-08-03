"use client";

import type { ReactNode } from "react";

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
        <DialogHeader>
          <DialogTitle>Punkteauswertung</DialogTitle>
        </DialogHeader>
        <DialogDescription>Siehe wer gewonnen hat</DialogDescription>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
        {!subtitle && typeof elapsedMs === "number" && (
          <p className="text-sm text-muted-foreground">
            ⏱ Spielzeit: {formatDuration(elapsedMs)}
          </p>
        )}
        <div className="mt-4">
          <ScoreDiagram players={players} />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <ShareResult players={players} config={shareConfig} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
