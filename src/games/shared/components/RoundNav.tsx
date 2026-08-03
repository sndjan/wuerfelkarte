"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type RoundNavProps = {
  /** Round currently on screen. */
  index: number;
  roundCount: number;
  /** The round play has actually reached — the target of "Zur aktuellen Runde". */
  currentRound: number;
  onJump: (index: number) => void;
};

/** Steps through the rounds of a round-based game and back to the live one. */
export function RoundNav({
  index,
  roundCount,
  currentRound,
  onJump,
}: RoundNavProps) {
  const browsingPast = index !== currentRound;

  return (
    <div className="mb-2 flex items-center justify-between px-4">
      <button
        type="button"
        aria-label="Vorherige Runde"
        disabled={index === 0}
        onClick={() => onJump(index - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card disabled:opacity-30"
      >
        <ChevronLeft size={18} />
      </button>
      {browsingPast ? (
        <button
          type="button"
          className="text-sm font-bold text-brand-accent underline"
          onClick={() => onJump(currentRound)}
        >
          Zur aktuellen Runde ({currentRound + 1})
        </button>
      ) : (
        <span className="text-sm text-muted-foreground">Aktuelle Runde</span>
      )}
      <button
        type="button"
        aria-label="Nächste Runde"
        disabled={index >= roundCount - 1}
        onClick={() => onJump(index + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
