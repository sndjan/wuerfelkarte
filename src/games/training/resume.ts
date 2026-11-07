import type { RunningGame } from "@/games/shared/resume";
import { TRAINING_EMOJI, TRAINING_NAME } from "./config";
import { TURNS, isFinished, totalScore } from "./game";
import { trainingStorage } from "./storage";

/** A training game with at least one roll made and not yet finished. */
export function runningTrainingGame(): RunningGame | null {
  const game = trainingStorage.loadGame();
  if (!game || isFinished(game)) return null;
  if (game.turns.length === 0 && !game.current.rolled) return null;
  return {
    gameKey: "training",
    gameName: TRAINING_NAME,
    emoji: TRAINING_EMOJI,
    href: "/training",
    modeName: "Solo",
    players: [],
    progress: `Zug ${game.turns.length + 1} von ${TURNS} · ${totalScore(game)} Punkte`,
    discard: () => trainingStorage.clearGame(),
  };
}
