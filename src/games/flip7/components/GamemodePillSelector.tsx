"use client";

import { flip7Gamemodes } from "../gamemodes";
import { Flip7GamemodeKey } from "../types";

interface GamemodePillSelectorProps {
  value: Flip7GamemodeKey;
  onChange: (key: Flip7GamemodeKey) => void;
}

export function GamemodePillSelector({
  value,
  onChange,
}: GamemodePillSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(flip7Gamemodes).map(([key, mode]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key as Flip7GamemodeKey)}
          className={
            // Border kept in both states so switching doesn't resize the pill.
            key === value
              ? "rounded-full border border-brand-accent bg-brand-accent px-4 py-2 font-semibold text-white"
              : "rounded-full border border-border bg-card px-4 py-2 font-semibold text-foreground"
          }
        >
          {mode.name}
        </button>
      ))}
    </div>
  );
}
