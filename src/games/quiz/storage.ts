import { createGameStorage } from "@/games/shared/storage";
import { PUZZLES_PER_DAY } from "./puzzles";
import { QuizDay, StoredQuizMatch } from "./types";

export const quizStorage = createGameStorage<
  QuizDay,
  StoredQuizMatch,
  Record<string, never>
>("quiz", {
  defaultSettings: {},
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
