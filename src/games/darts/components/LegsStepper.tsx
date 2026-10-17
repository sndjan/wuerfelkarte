"use client";

import { Minus, Plus } from "lucide-react";

import {
  DEFAULT_LEGS_TO_WIN,
  MAX_LEGS_TO_WIN,
  MIN_LEGS_TO_WIN,
} from "../scoring";

/** How many legs it takes to win the match. */
export function LegsStepper({
  value,
  onChange,
  min = MIN_LEGS_TO_WIN,
}: {
  value: number;
  onChange: (value: number) => void;
  /** Raised while a match runs so the target can't drop below what's won. */
  min?: number;
}) {
  const lowerBound = Math.max(MIN_LEGS_TO_WIN, min);

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card p-4">
      <button
        type="button"
        aria-label="Weniger Legs"
        disabled={value - 1 < lowerBound}
        onClick={() => onChange(value - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
      >
        <Minus size={18} />
      </button>
      <span className="min-w-16 text-center text-2xl font-bold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Mehr Legs"
        disabled={value + 1 > MAX_LEGS_TO_WIN}
        onClick={() => onChange(value + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
      >
        <Plus size={18} />
      </button>
      <span className="text-sm text-muted-foreground">
        {value === 1 ? "Ein Leg entscheidet" : `First to ${value} Legs`}
      </span>
      {value !== DEFAULT_LEGS_TO_WIN && DEFAULT_LEGS_TO_WIN >= lowerBound && (
        <button
          type="button"
          className="ml-auto text-sm font-semibold text-brand-accent underline"
          onClick={() => onChange(DEFAULT_LEGS_TO_WIN)}
        >
          Standard ({DEFAULT_LEGS_TO_WIN})
        </button>
      )}
    </div>
  );
}
