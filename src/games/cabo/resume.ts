import { RunningGame } from "@/games/shared/resume";
import { CABO_EMOJI } from "./config";
import { caboGamemodes, gamemodeSlug } from "./gamemodes";
import { firstOpenRound } from "./scoring";
import { caboStorage } from "./storage";

/** The stored game, unless it is the lobby-less placeholder or already over. */
export function runningCaboGame(): RunningGame | null {
  const game = caboStorage.loadGame();
  if (!game || game.players.length === 0 || game.finishedAt != null) return null;
  if (!(game.gamemode in caboGamemodes)) return null;
  return {
    gameKey: "cabo",
    gameName: "Cabo",
    emoji: CABO_EMOJI,
    href: `/cabo/${gamemodeSlug(game.gamemode)}`,
    modeName: caboGamemodes[game.gamemode].name,
    players: game.players,
    progress: `Runde ${firstOpenRound(game) + 1} · Ziel ${game.targetScore}`,
  };
}
