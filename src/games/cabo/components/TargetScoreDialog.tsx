"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { clampTargetScore } from "../scoring";
import { TargetScoreStepper } from "./TargetScoreStepper";

interface TargetScoreDialogProps {
  targetScore: number;
  /** Nobody may set a goal that is already behind the current worst total. */
  minTarget: number;
  onSetTargetScore: (value: number) => void;
  children: React.ReactNode;
}

export function TargetScoreDialog({
  targetScore,
  minTarget,
  onSetTargetScore,
  children,
}: TargetScoreDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(targetScore);

  // A goal someone already passed (the group chose to keep playing) would
  // start the stepper below its own floor.
  useEffect(() => {
    if (open) setDraft(Math.max(targetScore, minTarget));
  }, [open, targetScore, minTarget]);

  const save = () => {
    onSetTargetScore(Math.max(clampTargetScore(draft), minTarget));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Zielpunktzahl anpassen</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Das Spiel endet, sobald am Rundenende jemand mehr als diese Punktzahl
          hat.
        </DialogDescription>
        <TargetScoreStepper value={draft} onChange={setDraft} min={minTarget} />
        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Abbrechen
          </Button>
          <Button type="button" onClick={save}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
