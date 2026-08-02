"use client";

import { wizardGamemodes } from "./gamemodes";
import { WizardGamemodeKey } from "./types";

interface WizardGamemodePillSelectorProps {
  value: WizardGamemodeKey;
  onChange: (key: WizardGamemodeKey) => void;
}

export function WizardGamemodePillSelector({
  value,
  onChange,
}: WizardGamemodePillSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(wizardGamemodes).map(([key, mode]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key as WizardGamemodeKey)}
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
