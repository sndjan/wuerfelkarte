"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  BULL,
  DOUBLE_BULL,
  MISS,
  NUMBER_SEGMENTS,
  dart,
  dartAriaLabel,
} from "../scoring";
import { Dart } from "../types";

const MULTIPLIERS: Array<{ value: 1 | 2 | 3; label: string; short: string }> = [
  { value: 1, label: "Single", short: "S" },
  { value: 2, label: "Double", short: "D" },
  { value: 3, label: "Triple", short: "T" },
];

/**
 * Thumb input for small screens: pick the ring, then the number.
 *
 * The ring sticks for exactly one dart and falls back to Single afterwards —
 * the same way a scorer calls "triple twenty, twenty, five".
 */
export function DartKeypad({
  onThrow,
  disabled = false,
}: {
  onThrow: (dart: Dart) => void;
  disabled?: boolean;
}) {
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);

  const throwDart = (thrown: Dart) => {
    if (disabled) return;
    onThrow(thrown);
    setMultiplier(1);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {MULTIPLIERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={multiplier === option.value}
            disabled={disabled}
            onClick={() => setMultiplier(option.value)}
            className={cn(
              // The border stays in both states so switching never resizes the row.
              "rounded-xl border py-3 text-sm font-bold disabled:opacity-50",
              multiplier === option.value
                ? "border-brand-accent bg-brand-accent text-white"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {NUMBER_SEGMENTS.map((segment) => {
          const thrown = dart(segment, multiplier);
          return (
            <button
              key={segment}
              type="button"
              disabled={disabled}
              onClick={() => throwDart(thrown)}
              aria-label={dartAriaLabel(thrown)}
              className="flex h-14 flex-col items-center justify-center rounded-xl bg-secondary text-xl font-bold tabular-nums text-secondary-foreground active:bg-accent disabled:opacity-50"
            >
              {segment}
              {multiplier !== 1 && (
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {multiplier === 2 ? "D" : "T"} = {segment * multiplier}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => throwDart(BULL)}
          aria-label={dartAriaLabel(BULL)}
          className="h-14 rounded-xl bg-secondary text-lg font-bold text-secondary-foreground active:bg-accent disabled:opacity-50"
        >
          25
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => throwDart(DOUBLE_BULL)}
          aria-label={dartAriaLabel(DOUBLE_BULL)}
          className="h-14 rounded-xl bg-secondary text-lg font-bold text-secondary-foreground active:bg-accent disabled:opacity-50"
        >
          Bull 50
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => throwDart(MISS)}
          aria-label={dartAriaLabel(MISS)}
          className="h-14 rounded-xl border border-border bg-card text-lg font-bold text-muted-foreground active:bg-accent disabled:opacity-50"
        >
          Miss
        </button>
      </div>
    </div>
  );
}
