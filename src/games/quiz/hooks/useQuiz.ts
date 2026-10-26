import { useCallback, useEffect, useState } from "react";

import type { Category, Solver } from "@/games/yatzy/solver";
import { loadSolver } from "@/games/yatzy/solverTable";
import {
  applyKeep,
  applyRoll,
  applyScore,
  dailyStreak,
  dateKey,
  generateDailyQuiz,
  isArchiveDate,
  POINTS_PERFECT,
  puzzleLoss,
  puzzlePoints,
  startProgress,
} from "../puzzles";
import { loadDay, loadTutorialSeen, quizStorage, saveDay, saveTutorialSeen } from "../storage";
import { PuzzleProgress, QuizDay, QuizPuzzle, StoredQuizMatch } from "../types";

function createDay(solver: Solver, date: string): QuizDay {
  const puzzles = generateDailyQuiz(solver, date);
  return { date, puzzles, progress: puzzles.map(startProgress), startedAt: Date.now() };
}

function buildMatch(day: QuizDay): StoredQuizMatch {
  const points = day.progress.map(puzzlePoints);
  return {
    id: day.date,
    // Started on its own date, or caught up later from the archive.
    gamemode: dateKey(new Date(day.startedAt)) === day.date ? "daily" : "archive",
    timestamp: new Date(day.finishedAt ?? Date.now()).toISOString(),
    durationMs: day.finishedAt != null ? day.finishedAt - day.startedAt : undefined,
    players: [{ name: "Du", score: points.reduce((a, b) => a + b, 0) }],
    points,
    scale: POINTS_PERFECT,
    losses: day.progress.map(puzzleLoss),
  };
}

export type QuizStatus = "loading" | "error" | "missing" | "ready";

/**
 * One day's quiz — today's, or a past one from the archive: fetches the
 * solver table, restores or generates the day's puzzles, grades each decision
 * and writes the result into the history once the last puzzle is done.
 */
export function useQuiz(date?: string) {
  const [solver, setSolver] = useState<Solver | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [day, setDay] = useState<QuizDay | null>(null);
  const [matches, setMatches] = useState<StoredQuizMatch[]>([]);
  // Whether the day's quiz already has a decision — known from storage before
  // the solver arrives, so a returning player never sees the intro flash.
  // null until read (storage does not exist during the server render).
  const [startedToday, setStartedToday] = useState<boolean | null>(null);
  // Whether the tutorial still has to open by itself; null until read.
  const [tutorialSeen, setTutorialSeen] = useState<boolean | null>(null);
  // A date the archive does not offer (a typo, the future).
  const missing = date !== undefined && date !== dateKey() && !isArchiveDate(date);

  useEffect(() => {
    const stored = missing ? null : loadDay(date ?? dateKey());
    const started = stored?.progress.some((p) => p.steps.length > 0) ?? false;
    const history = quizStorage.loadMatches();
    setStartedToday(started);
    setMatches(history);
    // Anyone who already played knows the quiz, even from before the flag.
    setTutorialSeen(loadTutorialSeen() || started || history.length > 0);
  }, [date, missing]);

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
    if (!solver || missing) return;
    const target = date ?? dateKey();
    const stored = loadDay(target);
    if (stored) {
      setDay(stored);
    } else {
      const fresh = createDay(solver, target);
      // A past day is only stored once it is played, so browsing the
      // archive leaves no half-started days behind.
      if (target === dateKey()) saveDay(fresh);
      setDay(fresh);
    }
    setMatches(quizStorage.loadMatches());
  }, [solver, date, missing]);

  const commit = useCallback((next: QuizDay) => {
    if (next.finishedAt == null && next.progress.every((p) => p.done)) {
      next = { ...next, finishedAt: Date.now() };
      // The first result of a day stays: replaying a day whose details were
      // not kept yet must not replace it.
      const match = buildMatch(next);
      if (!quizStorage.loadMatches().some((m) => m.id === match.id)) {
        quizStorage.saveMatch(match);
      }
      setMatches(quizStorage.loadMatches());
    }
    saveDay(next);
    setDay(next);
  }, []);

  const updatePuzzle = (
    index: number,
    action: (solver: Solver, puzzle: QuizPuzzle, current: PuzzleProgress) => PuzzleProgress,
  ) => {
    if (!solver || !day) return;
    const next = action(solver, day.puzzles[index], day.progress[index]);
    commit({ ...day, progress: day.progress.map((p, i) => (i === index ? next : p)) });
  };

  const status: QuizStatus = missing
    ? "missing"
    : failed
      ? "error"
      : solver && day
        ? "ready"
        : "loading";

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
    streak: dailyStreak(matches, dateKey()),
    /** A past day, opened from the archive. */
    archive: date !== undefined && date !== dateKey(),
    retry: () => setAttempt((n) => n + 1),
    roll: (index: number) => updatePuzzle(index, (_, __, current) => applyRoll(current)),
    keep: (index: number, held: boolean[]) =>
      updatePuzzle(index, (s, puzzle, current) => applyKeep(s, puzzle, current, held)),
    score: (index: number, category: Category) =>
      updatePuzzle(index, (s, puzzle, current) => applyScore(s, puzzle, current, category)),
  };
}
