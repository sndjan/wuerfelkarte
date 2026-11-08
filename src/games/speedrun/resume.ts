import type { RunningGame } from "@/games/shared/resume";
import { CATEGORY_LABELS, SPEEDRUN_EMOJI, SPEEDRUN_NAME } from "./config";
import { TURNS, isFinished, isStarted } from "./run";
import { speedrunStorage } from "./storage";

/** A started, unfinished run — its clock is still running. */
export function runningSpeedrunGame(): RunningGame | null {
  const game = speedrunStorage.loadGame();
  if (!game || !isStarted(game) || isFinished(game)) return null;
  return {
    gameKey: "speedrun",
    gameName: SPEEDRUN_NAME,
    emoji: SPEEDRUN_EMOJI,
    href: "/speedrun",
    modeName: CATEGORY_LABELS[game.category],
    players: [],
    progress: `Zug ${game.turns.length + 1} von ${TURNS} · die Uhr läuft`,
    discard: () => speedrunStorage.clearGame(),
  };
}
