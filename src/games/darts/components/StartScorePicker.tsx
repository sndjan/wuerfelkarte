"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_START_SCORE,
  MAX_START_SCORE,
  MIN_START_SCORE,
  START_SCORE_PRESETS,
  START_SCORE_STEP,
  clampStartScore,
} from "../scoring";

/**
 * The three scores everyone plays, plus a stepper for the groups that don't:
 * every value stays on the x01 grid, so a custom game still ends in 01.
 */
export function StartScorePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {START_SCORE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            aria-pressed={value === preset}
            className={cn(
              "rounded-full border px-4 py-2 font-semibold tabular-nums",
              value === preset
                ? "border-brand-accent bg-brand-accent text-white"
                : "border-border bg-card text-foreground",
            )}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 rounded-2xl bg-card p-4">
        <button
          type="button"
          aria-label="Startpunkte verringern"
          disabled={value - START_SCORE_STEP < MIN_START_SCORE}
          onClick={() => onChange(clampStartScore(value - START_SCORE_STEP))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
        >
          <Minus size={18} />
        </button>
        <span className="min-w-16 text-center text-2xl font-bold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          aria-label="Startpunkte erhöhen"
          disabled={value + START_SCORE_STEP > MAX_START_SCORE}
          onClick={() => onChange(clampStartScore(value + START_SCORE_STEP))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
        >
          <Plus size={18} />
        </button>
        {value !== DEFAULT_START_SCORE && (
          <button
            type="button"
            className="ml-auto text-sm font-semibold text-brand-accent underline"
            onClick={() => onChange(DEFAULT_START_SCORE)}
          >
            Standard ({DEFAULT_START_SCORE})
          </button>
        )}
      </div>
    </div>
  );
}
