"use client";

import { Minus, Plus } from "lucide-react";
import {
  DEFAULT_TARGET_SCORE,
  MAX_TARGET_SCORE,
  MIN_TARGET_SCORE,
  TARGET_SCORE_STEP,
} from "../scoring";

interface TargetScoreStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Raised while a game runs so the target can't drop below what's scored. */
  min?: number;
}

export function TargetScoreStepper({
  value,
  onChange,
  min = MIN_TARGET_SCORE,
}: TargetScoreStepperProps) {
  const lowerBound = Math.max(MIN_TARGET_SCORE, min);

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card p-4">
      <button
        type="button"
        aria-label="Zielpunktzahl verringern"
        disabled={value - TARGET_SCORE_STEP < lowerBound}
        onClick={() => onChange(value - TARGET_SCORE_STEP)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
      >
        <Minus size={18} />
      </button>
      <span className="min-w-16 text-center text-2xl font-bold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Zielpunktzahl erhöhen"
        disabled={value + TARGET_SCORE_STEP > MAX_TARGET_SCORE}
        onClick={() => onChange(value + TARGET_SCORE_STEP)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
      >
        <Plus size={18} />
      </button>
      {value !== DEFAULT_TARGET_SCORE &&
        DEFAULT_TARGET_SCORE >= lowerBound && (
          <button
            type="button"
            className="ml-auto text-sm font-semibold text-brand-accent underline"
            onClick={() => onChange(DEFAULT_TARGET_SCORE)}
          >
            Standard ({DEFAULT_TARGET_SCORE})
          </button>
        )}
    </div>
  );
}
