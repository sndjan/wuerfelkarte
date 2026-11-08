import { useCallback, useEffect, useState } from "react";

import type { Category, Solver } from "@/games/yatzy/solver";
import { loadSolver } from "@/games/yatzy/solverTable";
import { dateKey } from "@/games/quiz/puzzles";
import { queueSubmission } from "../distribution";
import { applyKeep, applyRoll, applyScore, buildMatch, isFinished, newRun } from "../run";
import { dailyAttempted, markDailyAttempted, speedrunStorage } from "../storage";
import type { SpeedrunCategory, SpeedrunGame, StoredSpeedrunMatch } from "../types";

export type SpeedrunStatus = "loading" | "error" | "ready";

/**
 * The speedrun: fetches the solver table before the first run can start
 * (every decision is graded on the spot), restores a run whose clock is
 * still going, and records the result when the card is full.
 */
export function useSpeedrun() {
  const [solver, setSolver] = useState<Solver | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [game, setGame] = useState<SpeedrunGame | null>(null);
  const [matches, setMatches] = useState<StoredSpeedrunMatch[]>([]);
  const [category, setCategoryState] = useState<SpeedrunCategory>("classic");

  useEffect(() => {
    const stored = speedrunStorage.loadGame();
    // A run that never got its first roll has nothing to resume.
    setGame(stored && stored.clockStart !== undefined ? stored : null);
    setMatches(speedrunStorage.loadMatches());
    setCategoryState(stored?.category ?? speedrunStorage.loadSettings().category);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    loadSolver().then(
      (s) => !cancelled && setSolver(s),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const commit = useCallback((next: SpeedrunGame) => {
    if (isFinished(next)) {
      const match = buildMatch(next);
      speedrunStorage.saveMatch(match);
      setMatches(speedrunStorage.loadMatches());
      if (next.category === "daily" && next.ranked && next.date) {
        queueSubmission(next.date, match.timeMs, match.strafeMs);
      }
    }
    speedrunStorage.saveGame(next);
    setGame(next);
  }, []);

  const update = (action: (solver: Solver, game: SpeedrunGame) => SpeedrunGame) => {
    if (!solver || !game) return;
    const next = action(solver, game);
    if (next !== game) commit(next);
  };

  /** A new run of the category, rolled at once: the clock starts now. */
  const start = (which: SpeedrunCategory = category) => {
    if (!solver) return;
    let run: SpeedrunGame;
    if (which === "daily") {
      const date = dateKey();
      const ranked = !dailyAttempted(date);
      if (ranked) markDailyAttempted(date);
      run = newRun("daily", { date, ranked });
    } else {
      run = newRun(which);
    }
    commit(applyRoll(run));
  };

  const status: SpeedrunStatus = failed ? "error" : solver && loaded ? "ready" : "loading";

  return {
    status,
    solver,
    game,
    matches,
    category,
    setCategory: (next: SpeedrunCategory) => {
      setCategoryState(next);
      speedrunStorage.saveSettings({ category: next });
    },
    retry: () => setAttempt((n) => n + 1),
    start,
    roll: () => update((_, g) => applyRoll(g)),
    keep: (held: boolean[]) => update((s, g) => applyKeep(s, g, held)),
    score: (field: Category) => update((s, g) => applyScore(s, g, field)),
    /** Back to the start screen; an unfinished run is thrown away unrecorded. */
    leave: () => {
      speedrunStorage.clearGame();
      setGame(null);
    },
  };
}
