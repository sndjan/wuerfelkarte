"use client";

import { Check, Dices } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Die } from "@/games/quiz/components/Die";
import { cn } from "@/lib/utils";
import type { RollKind } from "../engine";

type OnlineDiceProps = {
  line: ReactNode;
  /** The faces shown; undefined = blank (not rolled yet). */
  faces: (number | undefined)[];
  /** Dice kept for the next roll (the own picks, or the live picks of the player on turn). */
  kept: boolean[];
  /** Dice the rules keep anyway. */
  locked: boolean[];
  rolling: boolean[] | null;
  /** Only the player on turn can toggle, and only dice the rules allow. */
  canToggle: (index: number) => boolean;
  onToggle: (index: number) => void;
  /** Mission "zwei Würfel festlegen": the faces chosen before the first roll. */
  preset: (number | null)[] | null;
  onPreset: (slot: number, face: number | null) => void;
  nextRoll: RollKind | null;
  rollsUsed: number;
  maxRolls: number;
  myTurn: boolean;
  busy: boolean;
  onRoll: () => void;
  selected: { label: string; text: string } | null;
  onScore: () => void;
};

const ROLL_LABEL: Record<RollKind, string> = {
  normal: "Würfeln",
  "extra-six": "Extra-Wurf",
  "all-dice": "Alle neu würfeln",
};

/** The dice and the turn's one button: roll, or enter the picked field. */
export function OnlineDice({
  line,
  faces,
  kept,
  locked,
  rolling,
  canToggle,
  onToggle,
  preset,
  onPreset,
  nextRoll,
  rollsUsed,
  maxRolls,
  myTurn,
  busy,
  onRoll,
  selected,
  onScore,
}: OnlineDiceProps) {
  const animating = rolling !== null;
  return (
    <div className="sticky bottom-2 z-10">
      <Card className="gap-2.5 p-3">
        <div className="flex min-h-6 min-w-0 items-center gap-2 text-sm">{line}</div>
        {preset && (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Vor dem Wurf zwei Würfel festlegen (optional):</span>
            {preset.map((face, slot) => (
              <div key={slot} className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onPreset(slot, face === f ? null : f)}
                    className={cn(
                      "size-7 rounded-md border font-bold",
                      face === f ? "border-brand-accent bg-brand-accent text-white" : "border-border",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="grid justify-items-center gap-2" style={{ gridTemplateColumns: `repeat(${faces.length}, minmax(0, 1fr))` }}>
          {faces.map((value, i) => (
            <Die
              key={i}
              value={value}
              held={kept[i] || locked[i]}
              rolling={animating && (rolling?.[i] ?? false)}
              onToggle={!animating && canToggle(i) ? () => onToggle(i) : undefined}
            />
          ))}
        </div>
        {myTurn && (
          <div className="flex gap-2">
            {selected && (
              <Button
                className="h-11 flex-1 bg-brand-accent text-base text-white hover:bg-brand-accent/90"
                disabled={animating || busy}
                onClick={onScore}
              >
                <Check className="size-5" />
                {selected.label} {selected.text}
              </Button>
            )}
            {(!selected || nextRoll !== null) && (
              <Button
                className={cn("h-11 text-base", selected ? "shrink-0" : "flex-1")}
                variant={selected ? "outline" : "default"}
                disabled={nextRoll === null || animating || busy}
                onClick={onRoll}
              >
                <Dices className="size-5" />
                {!selected && (nextRoll ? ROLL_LABEL[nextRoll] : "Feld wählen")}
                {!selected && nextRoll === "normal" && (
                  <span className="text-xs opacity-70">
                    {rollsUsed + 1}/{maxRolls}
                  </span>
                )}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
