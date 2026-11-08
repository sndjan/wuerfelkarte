"use client";

import { Check, Dices } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Die } from "./Die";

type DiceDockProps = {
  /** One line above the dice: the verdict on the last move, a tip, or a nudge. */
  feedback: ReactNode;
  dice: number[];
  /** false before the turn's first roll: the dice are blank. */
  rolled: boolean;
  held: boolean[];
  /** Rerolls left once rolled (2 → 1 → 0). */
  rollsLeft: number;
  /** Which dice shake, while `animating`. */
  rolling: boolean[] | null;
  animating: boolean;
  onToggle: (index: number) => void;
  canRoll: boolean;
  onRoll: () => void;
  /** The picked field and what it scores; the main button then enters it. */
  selected: { label: string; points: number } | null;
  onScore: () => void;
  /** A small button left of the main one, e.g. the training's tip. */
  aside?: ReactNode;
};

/** The rolls still to come as dots, so the button needs no words for them. */
function RollDots({ left }: { left: number }) {
  return (
    <span className="ml-0.5 flex gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("size-1.5 rounded-full bg-current", i >= left && "opacity-30")} />
      ))}
    </span>
  );
}

/**
 * The dice and the one button of a turn, at the bottom of the screen: it
 * rolls, or — once a field is picked on the card — enters that field.
 */
export function DiceDock({
  feedback,
  dice,
  rolled,
  held,
  rollsLeft,
  rolling,
  animating,
  onToggle,
  canRoll,
  onRoll,
  selected,
  onScore,
  aside,
}: DiceDockProps) {
  // Before the first roll the turn still has all three rolls.
  const rolls = rolled ? rollsLeft : rollsLeft + 1;
  return (
    <div className="sticky bottom-2 z-10 mt-auto">
      <Card className="gap-2.5 p-3">
        <div className="flex min-h-6 min-w-0 items-center gap-2 text-sm">{feedback}</div>
        <div className="grid grid-cols-5 justify-items-center gap-2">
          {dice.map((value, i) => (
            <Die
              key={i}
              value={rolled ? value : undefined}
              held={held[i]}
              rolling={animating && (rolling?.[i] ?? false)}
              onToggle={rolled && rollsLeft > 0 && !animating ? () => onToggle(i) : undefined}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {aside}
          {selected ? (
            <Button
              className="h-11 flex-1 bg-brand-accent text-base text-white hover:bg-brand-accent/90"
              disabled={animating}
              onClick={onScore}
            >
              <Check className="size-5" />
              {selected.label} {selected.points > 0 ? `+${selected.points}` : "streichen"}
            </Button>
          ) : (
            <Button
              className="h-11 flex-1 text-base"
              disabled={!canRoll || animating}
              onClick={onRoll}
              aria-label={`Würfeln, noch ${rolls} ${rolls === 1 ? "Wurf" : "Würfe"}`}
            >
              <Dices className="size-5" />
              Würfeln
              <RollDots left={rolls} />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
