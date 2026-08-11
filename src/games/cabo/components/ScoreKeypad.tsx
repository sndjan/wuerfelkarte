"use client";

import { Check, Delete } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MAX_CARD_SUM } from "../scoring";

const MAX_DIGITS = String(MAX_CARD_SUM).length;

interface ScoreKeypadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: number | null;
  onSubmit: (value: number | null) => void;
}

/**
 * Digit pad in a dialog instead of a native number input — the system
 * keyboard tends to cover the row being edited.
 */
export function ScoreKeypad({
  open,
  onOpenChange,
  title,
  value,
  onSubmit,
}: ScoreKeypadProps) {
  const [draft, setDraft] = useState("");

  // Every opening starts from whatever is currently stored, so re-tapping a
  // value corrects it rather than continuing an older draft.
  useEffect(() => {
    if (!open) return;
    setDraft(value != null ? String(value) : "");
  }, [open, value]);

  const appendDigit = (digit: string) =>
    setDraft((prev) => {
      const next = prev === "0" ? digit : prev + digit;
      return next.length > MAX_DIGITS ? prev : next;
    });

  const parsed = draft === "" ? null : Number(draft);
  const points =
    parsed == null || Number.isNaN(parsed) ? null : Math.min(parsed, MAX_CARD_SUM);

  const commit = () => {
    onSubmit(points);
    onOpenChange(false);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Summe der eigenen Restkarten am Rundenende.
        </DialogDescription>

        <div className="my-2 flex h-16 items-center justify-center gap-2 rounded-2xl bg-accent text-4xl font-bold tabular-nums">
          {draft === "" ? (
            <span className="text-muted-foreground">–</span>
          ) : (
            draft
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => appendDigit(key)}
              className="flex h-14 items-center justify-center rounded-xl bg-secondary text-2xl font-bold active:bg-accent"
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDraft((prev) => prev.slice(0, -1))}
            aria-label="Letzte Ziffer löschen"
            className="flex h-14 items-center justify-center rounded-xl bg-secondary active:bg-accent"
          >
            <Delete size={22} />
          </button>
          <button
            type="button"
            onClick={() => appendDigit("0")}
            className="flex h-14 items-center justify-center rounded-xl bg-secondary text-2xl font-bold active:bg-accent"
          >
            0
          </button>
          <button
            type="button"
            onClick={commit}
            aria-label="Übernehmen"
            className="flex h-14 items-center justify-center rounded-xl bg-primary text-primary-foreground active:opacity-80"
          >
            <Check size={22} />
          </button>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => setDraft("")}
          disabled={draft === ""}
        >
          Leeren
        </Button>
      </DialogContent>
    </Dialog>
  );
}
