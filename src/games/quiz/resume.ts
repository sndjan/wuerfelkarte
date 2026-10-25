import { RunningGame } from "@/games/shared/resume";
import { QUIZ_EMOJI, QUIZ_NAME } from "./config";
import { dateKey } from "./puzzles";
import { quizStorage } from "./storage";

/** Today's quiz once a decision is made and before the last puzzle is done. */
export function runningQuizGame(): RunningGame | null {
  const day = quizStorage.loadGame();
  if (!day || day.date !== dateKey() || day.finishedAt != null) return null;
  if (day.progress.every((p) => p.steps.length === 0)) return null;
  const current = day.progress.findIndex((p) => !p.done);
  return {
    gameKey: "quiz",
    gameName: QUIZ_NAME,
    emoji: QUIZ_EMOJI,
    href: "/quiz",
    modeName: "Tagesquiz",
    players: [],
    progress: `Aufgabe ${current + 1} von ${day.progress.length}`,
  };
}
