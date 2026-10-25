import { RunningGame } from "@/games/shared/resume";
import { DARTS_EMOJI } from "./config";
import { dartsGamemodes, gamemodeSlug } from "./gamemodes";
import { currentLegIndex } from "./scoring";
import { dartsStorage } from "./storage";

/** The stored match, unless it is the lobby-less placeholder or already decided. */
export function runningDartsGame(): RunningGame | null {
  const game = dartsStorage.loadGame();
  if (!game || game.players.length === 0 || game.finishedAt != null) return null;
  if (!(game.gamemode in dartsGamemodes)) return null;
  return {
    gameKey: "darts",
    gameName: "Darts",
    emoji: DARTS_EMOJI,
    href: `/darts/${gamemodeSlug(game.gamemode)}`,
    modeName: `${dartsGamemodes[game.gamemode].name} · ${game.startScore}`,
    players: game.players,
    progress: `Leg ${currentLegIndex(game) + 1} · First to ${game.legsToWin}`,
  };
}
