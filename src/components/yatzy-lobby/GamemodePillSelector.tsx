"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";

interface GamemodePillSelectorProps {
  value: string;
  onChange: (key: string) => void;
}

export function GamemodePillSelector({
  value,
  onChange,
}: GamemodePillSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(gamemodes).map(([key, mode]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={
            key === value
              ? "rounded-full bg-brand-accent px-4 py-2 font-semibold text-white"
              : "rounded-full border border-border bg-card px-4 py-2 font-semibold text-foreground"
          }
        >
          {mode.name}
        </button>
      ))}
    </div>
  );
}
