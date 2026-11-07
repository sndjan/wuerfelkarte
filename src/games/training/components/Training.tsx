"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TRAINING_NAME } from "../config";
import { isFinished } from "../game";
import { useTraining } from "../hooks/useTraining";
import { TrainingSummary } from "./TrainingSummary";
import { TurnView } from "./TurnView";

/**
 * Kniffel-Training: a whole solo game with digital dice, where every
 * decision is graded against the optimal strategy as it is made.
 */
export function Training() {
  const { status, solver, game, matches, retry, roll, keep, score, restart } = useTraining();
  // The dice the last roll threw, so the next view can shake them.
  const [rolling, setRolling] = useState<boolean[] | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const inProgress = game !== null && !isFinished(game) && (game.turns.length > 0 || game.current.rolled);

  const header = (
    <PageHeader
      backHref="/"
      title={TRAINING_NAME}
      right={
        inProgress && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Neues Spiel"
            onClick={() => setConfirmRestart(true)}
            className="rounded-full bg-white"
          >
            <RotateCcw />
          </Button>
        )
      }
    />
  );

  if (status === "error") {
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <p>Das Training konnte nicht geladen werden.</p>
          <Button onClick={retry}>Nochmal versuchen</Button>
        </div>
      </>
    );
  }

  if (status === "loading" || !solver || !game) {
    return (
      <>
        {header}
        <p className="px-4 py-12 text-center text-muted-foreground">Training wird geladen…</p>
      </>
    );
  }

  const steps = game.current.steps.length;
  const newGame = () => {
    setRolling(null);
    restart();
  };

  return (
    <>
      {header}
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-8">
        {isFinished(game) ? (
          <TrainingSummary solver={solver} game={game} matches={matches} onRestart={newGame} />
        ) : (
          <TurnView
            key={`${game.id}-${game.turns.length}-${game.current.rolled}-${steps}`}
            solver={solver}
            game={game}
            rolling={rolling}
            onRoll={() => {
              setRolling(game.current.dice.map(() => true));
              roll();
            }}
            onKeep={(held) => {
              setRolling(held.map((h) => !h));
              keep(held);
            }}
            onScore={(category) => {
              setRolling(null);
              score(category);
            }}
          />
        )}
      </div>

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Spiel starten?</DialogTitle>
            <DialogDescription>
              Das laufende Training wird verworfen und nicht gewertet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestart(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                setConfirmRestart(false);
                newGame();
              }}
            >
              Neues Spiel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
