"use client";

import { cn } from "@/lib/utils";
import {
  IN_RULE_HINTS,
  IN_RULE_LABELS,
  OUT_RULE_HINTS,
  OUT_RULE_LABELS,
} from "../gamemodes";
import { DartsInRule, DartsOutRule } from "../types";

const IN_RULES: DartsInRule[] = ["straight", "double", "master"];
const OUT_RULES: DartsOutRule[] = ["straight", "double", "master"];

function RuleRow<T extends string>({
  label,
  options,
  labels,
  hint,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  labels: Record<T, string>;
  hint: string;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold",
              value === option
                ? "border-brand-accent bg-brand-accent text-white"
                : "border-border bg-card text-foreground",
            )}
          >
            {labels[option]}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

/** How a leg has to be opened and how it has to be finished. */
export function CheckoutRulesPicker({
  inRule,
  outRule,
  onChangeInRule,
  onChangeOutRule,
}: {
  inRule: DartsInRule;
  outRule: DartsOutRule;
  onChangeInRule: (rule: DartsInRule) => void;
  onChangeOutRule: (rule: DartsOutRule) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <RuleRow
        label="Eröffnung"
        options={IN_RULES}
        labels={IN_RULE_LABELS}
        hint={IN_RULE_HINTS[inRule]}
        value={inRule}
        onChange={onChangeInRule}
      />
      <RuleRow
        label="Ausmachen"
        options={OUT_RULES}
        labels={OUT_RULE_LABELS}
        hint={OUT_RULE_HINTS[outRule]}
        value={outRule}
        onChange={onChangeOutRule}
      />
    </div>
  );
}
