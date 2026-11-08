"use client";

import { useEffect, useState } from "react";

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
import { SPEEDRUN_NAME } from "../config";
import { useSpeedrun } from "../hooks/useSpeedrun";
import { isFinished } from "../run";
import { FinishPanel } from "./FinishPanel";
import { RunView } from "./RunView";
import { StartPanel } from "./StartPanel";

/**
 * Kniffel-Speedrun: a whole solo card against the clock. The result is the
 * time plus a second per expected point the decisions gave away — the dice
 * themselves cannot make a run better or worse.
 */
export function Speedrun() {
  const { status, solver, game, matches, category, setCategory, retry, start, roll, keep, score, leave } =
    useSpeedrun();
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  // Start, run and finish are separate screens: each opens at the top.
  const screen = !game ? "start" : isFinished(game) ? "finish" : "run";
  useEffect(() => window.scrollTo(0, 0), [screen]);

  const header = <PageHeader backHref="/" title={SPEEDRUN_NAME} />;

  if (status === "error") {
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <p>Der Speedrun konnte nicht geladen werden.</p>
          <Button onClick={retry}>Nochmal versuchen</Button>
        </div>
      </>
    );
  }

  if (!game) {
    return (
      <>
        {header}
        <StartPanel
          category={category}
          onCategory={setCategory}
          matches={matches}
          ready={status === "ready"}
          onStart={() => start()}
        />
      </>
    );
  }

  if (isFinished(game)) {
    return (
      <>
        {header}
        <FinishPanel game={game} matches={matches} onAgain={() => start(game.category)} onLeave={leave} />
      </>
    );
  }

  if (!solver) {
    return (
      <>
        {header}
        <p className="px-4 py-12 text-center text-muted-foreground">
          Solver lädt … die Uhr läuft weiter.
        </p>
      </>
    );
  }

  return (
    <>
      <RunView
        key={`${game.id}-${game.turns.length}-${game.current.rolled}-${game.current.steps.length}`}
        solver={solver}
        game={game}
        matches={matches}
        showKeys={showKeys}
        onKeyboard={() => setShowKeys(true)}
        onRoll={roll}
        onKeep={keep}
        onScore={score}
        onAbort={() => setConfirmAbort(true)}
      />
      <Dialog open={confirmAbort} onOpenChange={setConfirmAbort}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lauf abbrechen?</DialogTitle>
            <DialogDescription>
              {game.category === "daily" && game.ranked
                ? "Der Lauf wird nicht gewertet, und der gewertete Tagesrun von heute ist damit verbraucht."
                : "Der Lauf wird verworfen und nicht gewertet."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAbort(false)}>
              Weiterlaufen
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmAbort(false);
                leave();
              }}
            >
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
