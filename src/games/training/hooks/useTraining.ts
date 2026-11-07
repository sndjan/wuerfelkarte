import { useCallback, useEffect, useState } from "react";

import type { Category, Solver } from "@/games/yatzy/solver";
import { loadSolver } from "@/games/yatzy/solverTable";
import { applyKeep, applyRoll, applyScore, buildMatch, isFinished, newGame } from "../game";
import { trainingStorage } from "../storage";
import type { StoredTrainingMatch, TrainingGame } from "../types";

export type TrainingStatus = "loading" | "error" | "ready";

/**
 * The training game: fetches the solver table, restores or starts a game,
 * grades every decision and records the result once the card is full.
 */
export function useTraining() {
  const [solver, setSolver] = useState<Solver | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [game, setGame] = useState<TrainingGame | null>(null);
  const [matches, setMatches] = useState<StoredTrainingMatch[]>([]);

  useEffect(() => {
    setGame(trainingStorage.loadGame() ?? newGame());
    setMatches(trainingStorage.loadMatches());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    loadSolver().then(
      (loaded) => !cancelled && setSolver(loaded),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const commit = useCallback((next: TrainingGame) => {
    if (isFinished(next)) {
      trainingStorage.saveMatch(buildMatch(next));
      setMatches(trainingStorage.loadMatches());
    }
    trainingStorage.saveGame(next);
    setGame(next);
  }, []);

  const update = (action: (solver: Solver, game: TrainingGame) => TrainingGame) => {
    if (!solver || !game) return;
    const next = action(solver, game);
    if (next !== game) commit(next);
  };

  const status: TrainingStatus = failed ? "error" : solver && game ? "ready" : "loading";

  return {
    status,
    solver,
    game,
    matches,
    retry: () => setAttempt((n) => n + 1),
    roll: () => update((_, g) => applyRoll(g)),
    keep: (held: boolean[]) => update((s, g) => applyKeep(s, g, held)),
    score: (category: Category) => update((s, g) => applyScore(s, g, category)),
    restart: () => {
      const fresh = newGame();
      trainingStorage.saveGame(fresh);
      setGame(fresh);
    },
  };
}
