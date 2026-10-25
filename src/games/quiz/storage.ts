import { createGameStorage } from "@/games/shared/storage";
import { PUZZLES_PER_DAY } from "./puzzles";
import { QuizDay, StoredQuizMatch } from "./types";

type QuizSettings = {
  /** Set once the tutorial was shown, so it only opens by itself for first timers. */
  tutorialSeen: boolean;
};

export const quizStorage = createGameStorage<
  QuizDay,
  StoredQuizMatch,
  QuizSettings
>("quiz", {
  defaultSettings: { tutorialSeen: false },
  // A day from an older shape is regenerated rather than repaired.
  reviveGame: (day) =>
    typeof day?.date === "string" &&
    Array.isArray(day.puzzles) &&
    Array.isArray(day.progress) &&
    day.puzzles.length === PUZZLES_PER_DAY &&
    day.progress.length === PUZZLES_PER_DAY
      ? day
      : null,
});

export const loadTutorialSeen = (): boolean =>
  quizStorage.loadSettings().tutorialSeen;

export const saveTutorialSeen = (): void =>
  quizStorage.saveSettings({ tutorialSeen: true });
