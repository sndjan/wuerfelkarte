"use client";

import { Check, Delete, Minus } from "lucide-react";
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
import { FLIP7_BONUS, MAX_ROUND_POINTS } from "../scoring";
import { Flip7Player } from "../types";

const MAX_DIGITS = String(MAX_ROUND_POINTS).length;

interface ScoreKeypadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  value: number | null;
  flip7: boolean;
  /** Mega-Fies: who the Flip 7 was cashed in against, `null` for "kept". */
  flip7PenaltyOn?: string | null;
  /** Mega-Fies: Maluskarten may drag a round below zero. */
  allowNegative?: boolean;
  /**
   * Mega-Fies: everyone the Flip-7-Bonus may be turned against. Empty or
   * missing hides the choice, so the bonus simply stays with its owner.
   */
  penaltyTargets?: Flip7Player[];
  /** Mega-Fies: a busted player still collects Mali, but never a Flip 7. */
  busted?: boolean;
  onSubmit: (
    value: number | null,
    flip7: boolean,
    flip7PenaltyOn: string | null,
  ) => void;
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
  flip7PenaltyOn = null,
  allowNegative = false,
  penaltyTargets,
  busted = false,
  onSubmit,
}: ScoreKeypadProps) {
  const [draft, setDraft] = useState("");
  const [negative, setNegative] = useState(false);
  const [draftFlip7, setDraftFlip7] = useState(false);
  const [draftPenaltyOn, setDraftPenaltyOn] = useState<string | null>(null);

  // Every opening starts from whatever is currently stored, so re-tapping a
  // value corrects it rather than continuing an older draft.
  useEffect(() => {
    if (!open) return;
    setDraft(value != null ? String(Math.abs(value)) : "");
    setNegative(value != null && value < 0);
    setDraftFlip7(flip7);
    setDraftPenaltyOn(flip7PenaltyOn);
  }, [open, value, flip7, flip7PenaltyOn]);

  const appendDigit = (digit: string) =>
    setDraft((prev) => {
      const next = prev === "0" ? digit : prev + digit;
      return next.length > MAX_DIGITS ? prev : next;
    });

  const parsed = draft === "" ? null : Number(draft);
  const magnitude =
    parsed == null || Number.isNaN(parsed)
      ? null
      : Math.min(parsed, MAX_ROUND_POINTS);
  // A busted round has no number cards left to add up: whatever is typed in
  // can only be the Maluskarten played against that person.
  const minus = allowNegative && (negative || busted);
  const points = magnitude == null ? null : minus ? -magnitude : magnitude;

  // Outside Mega-Fies 0 points is recorded as "Verzockt", which rules out a
  // Flip 7 — the toggle stays untouched so clearing the 0 brings the draft
  // back as it was. With Mali in play a bust can score below zero, so there
  // the flag comes from the entry instead of from the typed number.
  const busts = busted || (points === 0 && !allowNegative);
  const flip7Active = draftFlip7 && !busts;
  const penaltyOn = flip7Active ? draftPenaltyOn : null;
  const penaltyTarget = penaltyTargets?.find((p) => p.id === penaltyOn);
  const canPenalise = (penaltyTargets?.length ?? 0) > 0;

  const commit = () => {
    onSubmit(points, flip7Active, penaltyOn);
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
            `${minus ? "−" : ""}${draft}`
          )}
          {busts && (
            <span className="text-base font-semibold text-red-700 dark:text-red-400">
              💥 Verzockt
            </span>
          )}
          {flip7Active &&
            (penaltyTarget ? (
              <span className="text-base font-semibold text-muted-foreground">
                → {penaltyTarget.name} −{FLIP7_BONUS}
              </span>
            ) : (
              <span className="text-base font-semibold text-muted-foreground">
                + {FLIP7_BONUS} = {(points ?? 0) + FLIP7_BONUS}
              </span>
            ))}
        </div>

        <button
          type="button"
          aria-pressed={flip7Active}
          disabled={busts}
          onClick={() => setDraftFlip7((prev) => !prev)}
          className={cn(
            // Border kept in both states so toggling doesn't resize the row.
            "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold",
            flip7Active
              ? "border-brand-accent bg-brand-accent text-white"
              : "border-border bg-card text-muted-foreground",
            busts && "opacity-50",
          )}
        >
          <span>7️⃣ Flip 7</span>
          <span className="text-xs font-semibold">
            {flip7Active ? `+${FLIP7_BONUS} Extrapunkte` : "7 verschiedene Zahlen"}
          </span>
        </button>

        {/* Mega-Fies: the bonus may be given up to take 15 off someone else. */}
        {flip7Active && canPenalise && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Bonus behalten oder jemandem {FLIP7_BONUS} Punkte abziehen?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={penaltyOn == null}
                onClick={() => setDraftPenaltyOn(null)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-bold",
                  penaltyOn == null
                    ? "border-brand-accent bg-brand-accent text-white"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                +{FLIP7_BONUS} behalten
              </button>
              {penaltyTargets?.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  aria-pressed={penaltyOn === player.id}
                  onClick={() => setDraftPenaltyOn(player.id)}
                  className={cn(
                    "max-w-full truncate rounded-full border px-3 py-1 text-xs font-bold",
                    penaltyOn === player.id
                      ? "border-destructive bg-destructive text-white"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {player.emoji ? `${player.emoji} ` : ""}
                  {player.name} −{FLIP7_BONUS}
                </button>
              ))}
            </div>
          </div>
        )}

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

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDraft("")}
            disabled={draft === ""}
          >
            Leeren
          </Button>
          {/* Mega-Fies: Maluskarten can take more than the number cards gave. */}
          {allowNegative && (
            <button
              type="button"
              aria-pressed={minus}
              aria-label="Vorzeichen umschalten"
              disabled={busted}
              onClick={() => setNegative((prev) => !prev)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-bold",
                minus
                  ? "border-destructive bg-destructive text-white"
                  : "border-border bg-card text-muted-foreground",
                busted && "opacity-50",
              )}
            >
              <Minus size={16} />
              Minus
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
