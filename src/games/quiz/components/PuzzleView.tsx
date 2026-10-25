"use client";

import { Dices } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Category, Solver } from "@/games/yatzy/solver";
import { describeStep, formatLoss } from "../feedback";
import { toTurnState } from "../puzzles";
import type { PuzzleProgress, QuizPuzzle } from "../types";
import { Die } from "./Die";
import { Scorecard } from "./Scorecard";

type PuzzleViewProps = {
  solver: Solver;
  title: string;
  puzzle: QuizPuzzle;
  progress: PuzzleProgress;
  /** The day's progress dots, shown at the bottom of the dice card. */
  dots: ReactNode;
  onKeep: (held: boolean[]) => void;
  onScore: (category: Category) => void;
};

const rollsText = (rollsLeft: number) =>
  rollsLeft === 0 ? "Kein Wurf mehr" : `Noch ${rollsLeft} ${rollsLeft === 1 ? "Wurf" : "Würfe"}`;

const hintText = (rollsLeft: number) =>
  rollsLeft === 0
    ? "Wähle ein Feld auf deiner Karte."
    : "Halte Würfel und würfle neu – oder trag direkt ein.";

/**
 * One puzzle turn: a mission-style dice card above a Wunder-style sheet.
 * Held dice and the selected field are local — the parent keys this view by
 * step, so both reset after every decision.
 */
export function PuzzleView({ solver, title, puzzle, progress, dots, onKeep, onScore }: PuzzleViewProps) {
  const [held, setHeld] = useState<boolean[]>(() => progress.dice.map(() => false));
  const [selected, setSelected] = useState<Category | null>(null);

  // The fields these dice may go into, with their points — the solver knows
  // the extra-Wunder restriction, so the card never offers an illegal entry.
  const options = useMemo(() => {
    const entries = solver.analyze(toTurnState(puzzle.card), progress.dice, 0);
    return new Map(
      entries.flatMap((o) => (o.kind === "score" ? [[o.category, o.points] as const] : [])),
    );
  }, [solver, puzzle.card, progress.dice]);

  const lastStep = progress.steps.at(-1);
  const feedback = lastStep ? describeStep(lastStep) : null;
  const canRoll = progress.rollsLeft > 0 && held.some((h) => !h);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3 p-4">
        <h2 className="text-lg font-bold">{title}</h2>

        {/* Fixed rows, so the card never changes height between steps. */}
        <div className="flex w-full flex-col px-2">
          <div className="flex w-full items-start gap-2 px-3 text-sm font-semibold">
            🎲
            <span>{rollsText(progress.rollsLeft)}</span>
          </div>
          <div className="flex min-h-[3.25rem] w-full items-start gap-2 px-3 py-1.5 text-sm">
            {feedback ? (feedback.better ? "💡" : "✅") : "👉"}
            <span>
              {!feedback ? (
                hintText(progress.rollsLeft)
              ) : feedback.better ? (
                <>
                  Besser wäre <b>{feedback.better}</b> gewesen (−{formatLoss(feedback.loss)} Punkte).
                </>
              ) : (
                <>Beste Wahl: {feedback.chosen}.</>
              )}
            </span>
          </div>
        </div>

        <div className="grid w-full grid-cols-5 justify-items-center gap-2 px-2">
          {progress.dice.map((value, i) => (
            <Die
              key={i}
              value={value}
              held={held[i]}
              onToggle={
                progress.rollsLeft > 0
                  ? () => setHeld((prev) => prev.map((h, j) => (j === i ? !h : h)))
                  : undefined
              }
            />
          ))}
        </div>

        <div className="flex w-full gap-2 px-2">
          {progress.rollsLeft > 0 && (
            <Button variant="outline" className="flex-1" disabled={!canRoll} onClick={() => onKeep(held)}>
              <Dices />
              Würfeln
            </Button>
          )}
          <Button className="flex-1" disabled={!selected} onClick={() => selected && onScore(selected)}>
            {selected ? `${selected} eintragen` : "Feld wählen"}
          </Button>
        </div>

        {dots}
      </Card>

      <Scorecard
        card={puzzle.card}
        options={options}
        selected={selected}
        onSelect={(category) => setSelected((prev) => (prev === category ? null : category))}
      />
    </div>
  );
}
