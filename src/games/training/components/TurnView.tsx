"use client";

import { Check, Lightbulb } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category, Solver } from "@/games/yatzy/solver";
import { describeStep, formatLoss, moveText, shortCategoryLabel } from "@/games/quiz/feedback";
import { toTurnState } from "@/games/quiz/puzzles";
import { ROLL_MS } from "@/games/quiz/components/Die";
import { DiceDock } from "@/games/quiz/components/DiceDock";
import { Scorecard } from "@/games/quiz/components/Scorecard";
import { TURNS, bestMove, lastStep, totalScore, trainingStats } from "../game";
import type { TrainingGame } from "../types";
import { VerdictBadge, verdictColor } from "./MoveFeedback";

type TurnViewProps = {
  solver: Solver;
  game: TrainingGame;
  /** The dice the roll that led here threw, to animate them; null otherwise. */
  rolling: boolean[] | null;
  onRoll: () => void;
  onKeep: (held: boolean[]) => void;
  onScore: (category: Category) => void;
};

function StatTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <span className="truncate text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-base leading-5 font-extrabold tabular-nums">{children}</span>
    </div>
  );
}

/** How the game is going: three numbers and one segment per turn. */
function GameStats({ game }: { game: TrainingGame }) {
  const stats = trainingStats(game);
  const played = game.turns.length;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted px-3 pt-1 pb-2">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Beste Züge">
          {stats.optimal}
          <span className="text-sm font-normal text-muted-foreground">/{stats.decisions}</span>
        </StatTile>
        <StatTile label="Spielstärke">{stats.rating}</StatTile>
        <StatTile label="Verschenkt">{stats.loss > 0 ? `−${formatLoss(stats.loss)}` : "0"}</StatTile>
      </div>
      {/* Each finished turn in the colour of its worst decision. */}
      <div className="grid grid-cols-13 gap-[3px]" aria-hidden="true">
        {Array.from({ length: TURNS }, (_, i) => {
          const turn = game.turns[i];
          const worst = turn ? Math.max(0, ...turn.steps.map((s) => s.loss)) : null;
          return (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full",
                worst !== null ? verdictColor(worst) : "bg-foreground/15",
                i === played && "ring-2 ring-foreground/70",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * One decision of the training game: the scorecard in two columns, the game's
 * stats, and the dice at the bottom. Keyed by decision, so the selected field
 * and the hint reset after every move.
 */
export function TurnView({ solver, game, rolling, onRoll, onKeep, onScore }: TurnViewProps) {
  const { current } = game;
  const [held, setHeld] = useState<boolean[]>(() => [...current.held]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [hint, setHint] = useState(false);

  const reduceMotion = useReducedMotion() ?? false;
  const [shaking, setShaking] = useState(rolling !== null);
  const animating = shaking && !reduceMotion;
  useEffect(() => {
    if (!shaking) return;
    const id = setTimeout(() => setShaking(false), ROLL_MS);
    return () => clearTimeout(id);
  }, [shaking]);

  const rolled = current.rolled;
  const options = useMemo(() => {
    if (!rolled) return new Map<Category, number>();
    const entries = solver.analyze(toTurnState(game.card), current.dice, 0);
    return new Map(
      entries.flatMap((o) => (o.kind === "score" ? [[o.category, o.points] as const] : [])),
    );
  }, [solver, game.card, current.dice, rolled]);

  const tip = useMemo(() => {
    if (!hint) return null;
    const best = bestMove(solver, game);
    if (!best) return null;
    return moveText(
      best.kind === "keep"
        ? { kind: "keep", dice: best.dice, loss: 0, rank: 1, chosen: false }
        : { kind: "score", category: best.category, points: best.points, loss: 0, rank: 1, chosen: false },
    );
  }, [hint, solver, game]);

  const step = lastStep(game);
  const better = step ? describeStep(step).better : null;
  const canRoll = !rolled || (current.rollsLeft > 0 && held.some((h) => !h));

  const feedback = tip ? (
    <>
      <Lightbulb className="size-4 shrink-0 text-brand-badge" />
      <span className="truncate">
        Tipp: <b>{tip}</b>
      </span>
    </>
  ) : step ? (
    <>
      <VerdictBadge loss={step.loss} />
      {better ? (
        <span className="truncate text-muted-foreground">
          besser: <b className="text-foreground">{better}</b>
        </span>
      ) : (
        <Check className="size-4 shrink-0 text-brand-accent" />
      )}
    </>
  ) : (
    <span className="text-muted-foreground">
      {rolled ? "Würfel halten, neu würfeln oder eintragen" : "Würfle, um zu starten"}
    </span>
  );

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-2.5">
      <div className="flex items-center justify-between text-sm">
        <h2 className="font-extrabold">
          Zug {game.turns.length + 1}
          <span className="font-normal text-muted-foreground">/{TURNS}</span>
        </h2>
        <span className="rounded-full bg-muted px-3 py-1 font-extrabold tabular-nums">
          {totalScore(game)} Pkt.
        </span>
      </div>

      <Scorecard
        split
        card={game.card}
        options={options}
        selected={selected}
        onSelect={(category) => setSelected((prev) => (prev === category ? null : category))}
      />

      <GameStats game={game} />

      <DiceDock
        feedback={feedback}
        dice={current.dice}
        rolled={rolled}
        held={held}
        rollsLeft={current.rollsLeft}
        rolling={rolling}
        animating={animating}
        onToggle={(i) => setHeld((prev) => prev.map((h, j) => (j === i ? !h : h)))}
        canRoll={canRoll}
        onRoll={() => (rolled ? onKeep(held) : onRoll())}
        selected={
          selected ? { label: shortCategoryLabel(selected), points: options.get(selected) ?? 0 } : null
        }
        onScore={() => selected && onScore(selected)}
        aside={
          <Button
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            aria-label={hint ? "Tipp ausblenden" : "Tipp anzeigen"}
            aria-pressed={hint}
            disabled={!rolled || animating}
            onClick={() => setHint((h) => !h)}
          >
            <Lightbulb className="size-5" />
          </Button>
        }
      />
    </div>
  );
}
