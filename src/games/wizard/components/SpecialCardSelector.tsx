"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { deckSize } from "../scoring";
import {
  ALL_SPECIAL_CARDS,
  WIZARD_SPECIAL_CARDS,
  coupledWith,
  specialCardInfo,
} from "../specialCards";
import { WizardSpecialCard } from "../types";

interface SpecialCardSelectorProps {
  value: WizardSpecialCard[];
  onChange: (next: WizardSpecialCard[]) => void;
}

/** Reads "Alle 7 Sonderkarten" / "Keine Sonderkarten" / "💣 Bombe, ☁️ Wolke". */
function summarize(value: WizardSpecialCard[]): string {
  if (value.length === ALL_SPECIAL_CARDS.length)
    return `Alle ${ALL_SPECIAL_CARDS.length} Sonderkarten`;
  if (value.length === 0) return "Keine Sonderkarten";
  return value
    .map((id) => `${specialCardInfo(id).emoji} ${specialCardInfo(id).name}`)
    .join(", ");
}

export function SpecialCardSelector({
  value,
  onChange,
}: SpecialCardSelectorProps) {
  // Playing with everything is the normal case, so the list starts collapsed.
  const [open, setOpen] = useState(false);

  // Drache and Fee always enter and leave play together, so one tap moves both.
  const toggle = (card: WizardSpecialCard) => {
    const group = coupledWith(card);
    const next = value.includes(card)
      ? value.filter((c) => !group.includes(c))
      : [...value, ...group.filter((c) => !value.includes(c))];
    onChange(ALL_SPECIAL_CARDS.filter((id) => next.includes(id)));
  };

  return (
    <div className="rounded-2xl bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">{summarize(value)}</span>
          <span className="block text-xs text-muted-foreground">
            {deckSize(value)} Karten im Deck · zum Ändern antippen
          </span>
        </span>
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-border p-4 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Zum Kennenlernen erst mit ein paar Karten starten — der
              Gestaltenwandler ist am einfachsten.
            </p>
            <button
              type="button"
              onClick={() =>
                onChange(
                  value.length === ALL_SPECIAL_CARDS.length
                    ? []
                    : ALL_SPECIAL_CARDS,
                )
              }
              className="shrink-0 text-xs font-semibold text-brand-accent underline"
            >
              {value.length === ALL_SPECIAL_CARDS.length ? "Keine" : "Alle"}
            </button>
          </div>

          {WIZARD_SPECIAL_CARDS.map((card) => {
            const selected = value.includes(card.id);
            const partners = coupledWith(card.id).filter((c) => c !== card.id);
            return (
              <button
                key={card.id}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(card.id)}
                className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent/50"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                    selected
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {selected && <Check size={14} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {card.emoji} {card.name}
                    {partners.length > 0 && (
                      <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                        immer mit{" "}
                        {partners
                          .map((id) => specialCardInfo(id).name)
                          .join(" & ")}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {card.short}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
