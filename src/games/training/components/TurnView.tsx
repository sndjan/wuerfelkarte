"use client";

import { Dices, Lightbulb } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Category, Solver } from "@/games/yatzy/solver";
import { categoryLabel, moveText } from "@/games/quiz/feedback";
import { toTurnState } from "@/games/quiz/puzzles";
import { Die, ROLL_MS } from "@/games/quiz/components/Die";
import { Scorecard } from "@/games/quiz/components/Scorecard";
import { TRAINING_EMOJI } from "../config";
import { TURNS, bestMove, lastStep, totalScore, trainingStats } from "../game";
import type { TrainingGame } from "../types";
import { MoveFeedback } from "./MoveFeedback";

type TurnViewProps = {
  solver: Solver;
  game: TrainingGame;
  /** The dice the roll that led here threw, to animate them; null otherwise. */
  rolling: boolean[] | null;
  onRoll: () => void;
  onKeep: (held: boolean[]) => void;
  onScore: (category: Category) => void;
};

const rollsText = (rollsLeft: number) =>
  rollsLeft === 0 ? "Kein Wurf mehr" : `Noch ${rollsLeft} ${rollsLeft === 1 ? "Wurf" : "Würfe"}`;

/**
 * One decision of the training game: the dice, the verdict on the last move
 * and the scorecard. Keyed by decision, so the selected field and the hint
 * reset after every move.
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

  const stats = trainingStats(game);
  const canRoll = !rolled || (current.rollsLeft > 0 && held.some((h) => !h));

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3 p-4">
        <div className="flex w-full items-center justify-between px-2">
          <h2 className="text-lg font-bold">
            Zug {game.turns.length + 1} von {TURNS}
          </h2>
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-bold tabular-nums">
            {totalScore(game)} Pkt.
          </span>
        </div>
        <div className="flex w-full items-center justify-between px-2 text-xs text-muted-foreground">
          <span>🎲 {rollsText(rolled ? current.rollsLeft : current.rollsLeft + 1)}</span>
          {stats.decisions > 0 && (
            <span className="tabular-nums">
              {stats.optimal}/{stats.decisions} beste Züge · Spielstärke {stats.rating}
            </span>
          )}
        </div>

        <div className="grid w-full grid-cols-5 justify-items-center gap-2 px-2">
          {current.dice.map((value, i) => (
            <Die
              key={i}
              value={rolled ? value : undefined}
              held={held[i]}
              rolling={animating && (rolling?.[i] ?? false)}
              onToggle={
                rolled && current.rollsLeft > 0 && !animating
                  ? () => setHeld((prev) => prev.map((h, j) => (j === i ? !h : h)))
                  : undefined
              }
            />
          ))}
        </div>

        <div className="flex w-full gap-2 px-2">
          {(!rolled || current.rollsLeft > 0) && (
            <Button
              variant={rolled ? "outline" : "default"}
              className="flex-1"
              disabled={!canRoll || animating}
              onClick={() => (rolled ? onKeep(held) : onRoll())}
            >
              <Dices />
              Würfeln
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={!selected || animating}
            onClick={() => selected && onScore(selected)}
          >
            {selected ? `${categoryLabel(selected)} eintragen` : "Feld wählen"}
          </Button>
        </div>

        {rolled && (
          <div className="flex min-h-9 w-full items-center px-2">
            {tip ? (
              <p className="flex items-start gap-2 text-sm">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-badge" />
                <span>
                  Bester Zug: <b>{tip}</b>
                </span>
              </p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={animating}
                onClick={() => setHint(true)}
              >
                <Lightbulb />
                Tipp anzeigen
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <MoveFeedback step={lastStep(game)} />
      </Card>

      <Scorecard
        title={`${TRAINING_EMOJI} Deine Karte`}
        card={game.card}
        options={options}
        selected={selected}
        onSelect={(category) => setSelected((prev) => (prev === category ? null : category))}
      />
    </div>
  );
}
