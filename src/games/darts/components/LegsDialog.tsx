"use client";

import { useEffect, useState, type ReactNode } from "react";

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
import { LegsStepper } from "./LegsStepper";

/**
 * Changing the leg target mid-match. Raising it past the winner's tally is
 * also how a group plays on after the match has already been decided.
 */
export function LegsDialog({
  legsToWin,
  minLegs,
  onSetLegsToWin,
  children,
}: {
  legsToWin: number;
  minLegs: number;
  onSetLegsToWin: (value: number) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(legsToWin);

  // Every opening starts from what is currently set.
  useEffect(() => {
    if (open) setDraft(legsToWin);
  }, [open, legsToWin]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Legs anpassen</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Wie viele Legs braucht es für den Sieg? Wer schon mehr geholt hat, als
          hier steht, gewinnt die Partie sofort.
        </DialogDescription>
        <LegsStepper value={draft} onChange={setDraft} min={minLegs} />
        <DialogFooter>
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              onSetLegsToWin(draft);
              setOpen(false);
            }}
          >
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
