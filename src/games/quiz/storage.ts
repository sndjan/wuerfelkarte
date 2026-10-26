import { createGameStorage, readJSON, writeJSON } from "@/games/shared/storage";
import { PUZZLES_PER_DAY, dateKey } from "./puzzles";
import { QuizDay, StoredQuizMatch } from "./types";

type QuizSettings = {
  /** Set once the tutorial was shown, so it only opens by itself for first timers. */
  tutorialSeen: boolean;
};

// A day from an older shape is regenerated rather than repaired.
const reviveDay = (day: QuizDay | null | undefined): QuizDay | null =>
  typeof day?.date === "string" &&
  Array.isArray(day.puzzles) &&
  Array.isArray(day.progress) &&
  day.puzzles.length === PUZZLES_PER_DAY &&
  day.progress.length === PUZZLES_PER_DAY
    ? day
    : null;

export const quizStorage = createGameStorage<
  QuizDay,
  StoredQuizMatch,
  QuizSettings
>("quiz", {
  defaultSettings: { tutorialSeen: false },
  reviveGame: reviveDay,
});

/**
 * Every day that was played, by date, so the archive can show and resume
 * it. Today's day also sits in the game slot, where the home tile and the
 * resume card look for it; days from before this map existed only live there.
 */
const DAYS_KEY = "quiz:days";

type DayMap = Record<string, QuizDay>;

function loadDayMap(): DayMap {
  const days = readJSON<DayMap>(DAYS_KEY, {});
  return days && typeof days === "object" && !Array.isArray(days) ? days : {};
}

export function loadDays(): DayMap {
  const current = quizStorage.loadGame();
  const days = loadDayMap();
  return current && !days[current.date] ? { ...days, [current.date]: current } : days;
}

export const loadDay = (date: string): QuizDay | null => reviveDay(loadDays()[date]);

export function saveDay(day: QuizDay): void {
  writeJSON(DAYS_KEY, { ...loadDayMap(), [day.date]: day });
  if (day.date === dateKey()) quizStorage.saveGame(day);
}

export const loadTutorialSeen = (): boolean =>
  quizStorage.loadSettings().tutorialSeen;

export const saveTutorialSeen = (): void =>
  quizStorage.saveSettings({ tutorialSeen: true });
