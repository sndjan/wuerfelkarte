import { RunningGame } from "@/games/shared/resume";
import { FLIP7_EMOJI } from "./config";
import { flip7Gamemodes, gamemodeSlug } from "./gamemodes";
import { firstOpenRound } from "./scoring";
import { flip7Storage } from "./storage";

/** The stored game, unless it is the lobby-less placeholder or already over. */
export function runningFlip7Game(): RunningGame | null {
  const game = flip7Storage.loadGame();
  if (!game || game.players.length === 0 || game.finishedAt != null) return null;
  if (!(game.gamemode in flip7Gamemodes)) return null;
  return {
    gameKey: "flip7",
    gameName: "Flip 7",
    emoji: FLIP7_EMOJI,
    href: `/flip7/${gamemodeSlug(game.gamemode)}`,
    modeName: flip7Gamemodes[game.gamemode].name,
    players: game.players,
    progress: `Runde ${firstOpenRound(game) + 1} · Ziel ${game.targetScore}`,
    discard: flip7Storage.clearGame,
  };
}
