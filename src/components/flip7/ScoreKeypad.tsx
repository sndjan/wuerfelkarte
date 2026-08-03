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
import { cn } from "@/lib/utils";
import { FLIP7_BONUS, MAX_ROUND_POINTS } from "./scoring";

const MAX_DIGITS = String(MAX_ROUND_POINTS).length;

interface ScoreKeypadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  value: number | null;
  flip7: boolean;
  onSubmit: (value: number | null, flip7: boolean) => void;
}

/**
 * Digit pad in a dialog instead of a native number input: round scores go up
 * past 150, and the system keyboard tends to cover the row being edited. The
 * Flip 7 lives in here too — it is part of the same "what did you score" answer.
 */
export function ScoreKeypad({
  open,
  onOpenChange,
  title,
  description,
  value,
  flip7,
  onSubmit,
}: ScoreKeypadProps) {
  const [draft, setDraft] = useState("");
  const [draftFlip7, setDraftFlip7] = useState(false);

  // Every opening starts from whatever is currently stored, so re-tapping a
  // value corrects it rather than continuing an older draft.
  useEffect(() => {
    if (!open) return;
    setDraft(value != null ? String(value) : "");
    setDraftFlip7(flip7);
  }, [open, value, flip7]);

  const appendDigit = (digit: string) =>
    setDraft((prev) => {
      const next = prev === "0" ? digit : prev + digit;
      return next.length > MAX_DIGITS ? prev : next;
    });

  const parsed = draft === "" ? null : Number(draft);
  const points =
    parsed == null || Number.isNaN(parsed)
      ? null
      : Math.min(parsed, MAX_ROUND_POINTS);

  const commit = () => {
    onSubmit(points, draftFlip7);
    onOpenChange(false);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription>{description}</DialogDescription>

        <div className="my-2 flex h-16 items-center justify-center gap-2 rounded-2xl bg-accent text-4xl font-bold tabular-nums">
          {draft === "" ? (
            <span className="text-muted-foreground">–</span>
          ) : (
            draft
          )}
          {draftFlip7 && (
            <span className="text-base font-semibold text-muted-foreground">
              + {FLIP7_BONUS} = {(points ?? 0) + FLIP7_BONUS}
            </span>
          )}
        </div>

        <button
          type="button"
          aria-pressed={draftFlip7}
          onClick={() => setDraftFlip7((prev) => !prev)}
          className={cn(
            // Border kept in both states so toggling doesn't resize the row.
            "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold",
            draftFlip7
              ? "border-brand-accent bg-brand-accent text-white"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <span>7️⃣ Flip 7</span>
          <span className="text-xs font-semibold">
            {draftFlip7 ? `+${FLIP7_BONUS} Extrapunkte` : "7 verschiedene Zahlen"}
          </span>
        </button>

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
