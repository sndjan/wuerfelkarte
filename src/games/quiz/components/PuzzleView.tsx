"use client";

import { Check } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Category, Solver } from "@/games/yatzy/solver";
import { describeStep, formatLoss, shortCategoryLabel } from "../feedback";
import { toTurnState } from "../puzzles";
import type { PuzzleProgress, QuizPuzzle } from "../types";
import { DiceDock } from "./DiceDock";
import { ROLL_MS } from "./Die";
import { Scorecard } from "./Scorecard";

type PuzzleViewProps = {
  solver: Solver;
  title: string;
  puzzle: QuizPuzzle;
  progress: PuzzleProgress;
  /** The day's progress, shown next to the title. */
  dayProgress: ReactNode;
  /**
   * The dice the roll that led to this step threw, to animate them; null when
   * the view did not open on a fresh roll (resumed, or a new puzzle).
   */
  rolling: boolean[] | null;
  /** The turn's first roll, all five dice. */
  onRoll: () => void;
  onKeep: (held: boolean[]) => void;
  onScore: (category: Category) => void;
};

const hintText = (rolled: boolean, rollsLeft: number) =>
  !rolled
    ? "Würfle, um zu starten"
    : rollsLeft === 0
      ? "Wähle ein Feld"
      : "Würfel halten, neu würfeln oder eintragen";

/** The last decision in one line: a tick, or what it cost and what was better. */
function StepVerdict({ step }: { step: PuzzleProgress["steps"][number] }) {
  const { better, loss } = describeStep(step);
  if (!better) {
    return (
      <>
        <Check className="size-4 shrink-0 text-brand-accent" />
        <span className="font-bold">Beste Wahl</span>
      </>
    );
  }
  return (
    <>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums text-white",
          loss >= 3 ? "bg-orange-500" : "bg-brand-badge",
        )}
      >
        −{formatLoss(loss)}
      </span>
      <span className="truncate text-muted-foreground">
        besser: <b className="text-foreground">{better}</b>
      </span>
    </>
  );
}

/**
 * One puzzle turn: the whole card in two columns, the dice at the bottom.
 * The selected field is local — the parent keys this view by step, so it
 * resets after every decision; held dice start from the last reroll's.
 */
export function PuzzleView({
  solver,
  title,
  puzzle,
  progress,
  dayProgress,
  rolling,
  onRoll,
  onKeep,
  onScore,
}: PuzzleViewProps) {
  const [held, setHeld] = useState<boolean[]>(
    () => progress.held ?? progress.dice.map(() => false),
  );
  // The dice are settled up front; the shake is only for show.
  const reduceMotion = useReducedMotion() ?? false;
  const [shaking, setShaking] = useState(rolling !== null);
  const animating = shaking && !reduceMotion;

  useEffect(() => {
    if (!shaking) return;
    const id = setTimeout(() => setShaking(false), ROLL_MS);
    return () => clearTimeout(id);
  }, [shaking]);
  const [selected, setSelected] = useState<Category | null>(null);

  // Before the first roll the turn has three rolls and no dice yet.
  const rolled = progress.rolled !== false;

  // The fields these dice may go into, with their points — the solver knows
  // the extra-Wunder restriction, so the card never offers an illegal entry.
  const options = useMemo(() => {
    if (!rolled) return new Map<Category, number>();
    const entries = solver.analyze(toTurnState(puzzle.card), progress.dice, 0);
    return new Map(
      entries.flatMap((o) => (o.kind === "score" ? [[o.category, o.points] as const] : [])),
    );
  }, [solver, puzzle.card, progress.dice, rolled]);

  const lastStep = progress.steps.at(-1);
  const canRoll = !rolled || (progress.rollsLeft > 0 && held.some((h) => !h));

  const feedback = lastStep ? (
    <StepVerdict step={lastStep} />
  ) : (
    <span className="text-muted-foreground">{hintText(rolled, progress.rollsLeft)}</span>
  );

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-2.5">
      <div className="flex items-center gap-3 text-sm">
        <h2 className="shrink-0 font-extrabold">{title}</h2>
        {dayProgress}
      </div>

      <Scorecard
        split
        card={puzzle.card}
        options={options}
        selected={selected}
        onSelect={(category) => setSelected((prev) => (prev === category ? null : category))}
      />

      <DiceDock
        feedback={feedback}
        dice={progress.dice}
        rolled={rolled}
        held={held}
        rollsLeft={progress.rollsLeft}
        rolling={rolling}
        animating={animating}
        onToggle={(i) => setHeld((prev) => prev.map((h, j) => (j === i ? !h : h)))}
        canRoll={canRoll}
        onRoll={() => (rolled ? onKeep(held) : onRoll())}
        selected={
          selected ? { label: shortCategoryLabel(selected), points: options.get(selected) ?? 0 } : null
        }
        onScore={() => selected && onScore(selected)}
      />
    </div>
  );
}
