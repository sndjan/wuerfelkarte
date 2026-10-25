import { useCallback, useEffect, useState } from "react";

import type { Category, Solver } from "@/games/yatzy/solver";
import { loadSolver } from "@/games/yatzy/solverTable";
import {
  applyKeep,
  applyScore,
  currentStreak,
  dateKey,
  generateDailyQuiz,
  puzzleLoss,
  puzzlePoints,
  startProgress,
} from "../puzzles";
import { loadTutorialSeen, quizStorage, saveTutorialSeen } from "../storage";
import { QuizDay, StoredQuizMatch } from "../types";

function createDay(solver: Solver, date: string): QuizDay {
  const puzzles = generateDailyQuiz(solver, date);
  return { date, puzzles, progress: puzzles.map(startProgress), startedAt: Date.now() };
}

function buildMatch(day: QuizDay): StoredQuizMatch {
  const points = day.progress.map(puzzlePoints);
  return {
    id: day.date,
    gamemode: "daily",
    timestamp: new Date(day.finishedAt ?? Date.now()).toISOString(),
    durationMs: day.finishedAt != null ? day.finishedAt - day.startedAt : undefined,
    players: [{ name: "Du", score: points.reduce((a, b) => a + b, 0) }],
    points,
    losses: day.progress.map(puzzleLoss),
  };
}

export type QuizStatus = "loading" | "error" | "ready";

/**
 * Today's quiz: fetches the solver table, restores or generates the day's
 * puzzles, grades each decision and writes the result into the history once
 * the last puzzle is done.
 */
export function useQuiz() {
  const [solver, setSolver] = useState<Solver | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [day, setDay] = useState<QuizDay | null>(null);
  const [matches, setMatches] = useState<StoredQuizMatch[]>([]);
  // Whether today's quiz already has a decision — known from storage before
  // the solver arrives, so a returning player never sees the intro flash.
  // null until read (storage does not exist during the server render).
  const [startedToday, setStartedToday] = useState<boolean | null>(null);
  // Whether the tutorial still has to open by itself; null until read.
  const [tutorialSeen, setTutorialSeen] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = quizStorage.loadGame();
    const started =
      stored?.date === dateKey() && stored.progress.some((p) => p.steps.length > 0);
    const history = quizStorage.loadMatches();
    setStartedToday(started);
    setMatches(history);
    // Anyone who already played knows the quiz, even from before the flag.
    setTutorialSeen(loadTutorialSeen() || started || history.length > 0);
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

  useEffect(() => {
    if (!solver) return;
    const today = dateKey();
    const stored = quizStorage.loadGame();
    if (stored?.date === today) {
      setDay(stored);
    } else {
      const fresh = createDay(solver, today);
      quizStorage.saveGame(fresh);
      setDay(fresh);
    }
    setMatches(quizStorage.loadMatches());
  }, [solver]);

  const commit = useCallback((next: QuizDay) => {
    if (next.finishedAt == null && next.progress.every((p) => p.done)) {
      next = { ...next, finishedAt: Date.now() };
      quizStorage.saveMatch(buildMatch(next));
      setMatches(quizStorage.loadMatches());
    }
    quizStorage.saveGame(next);
    setDay(next);
  }, []);

  const updatePuzzle = (index: number, action: "keep" | "score", arg: boolean[] | Category) => {
    if (!solver || !day) return;
    const puzzle = day.puzzles[index];
    const current = day.progress[index];
    const next =
      action === "keep"
        ? applyKeep(solver, puzzle, current, arg as boolean[])
        : applyScore(solver, puzzle, current, arg as Category);
    commit({ ...day, progress: day.progress.map((p, i) => (i === index ? next : p)) });
  };

  const today = day?.date ?? dateKey();
  const status: QuizStatus = failed ? "error" : solver && day ? "ready" : "loading";

  return {
    status,
    solver,
    day,
    startedToday,
    tutorialSeen,
    markTutorialSeen: () => {
      saveTutorialSeen();
      setTutorialSeen(true);
    },
    matches,
    streak: currentStreak(
      matches.map((m) => m.id),
      today,
    ),
    retry: () => setAttempt((n) => n + 1),
    keep: (index: number, held: boolean[]) => updatePuzzle(index, "keep", held),
    score: (index: number, category: Category) => updatePuzzle(index, "score", category),
  };
}
