import { RunningGame } from "@/games/shared/resume";
import { WIZARD_EMOJI } from "./config";
import { gamemodeSlug, wizardGamemodes } from "./gamemodes";
import { firstOpenRound, isGameFinished } from "./scoring";
import { wizardStorage } from "./storage";

/** The stored game, unless it is the lobby-less placeholder or already over. */
export function runningWizardGame(): RunningGame | null {
  const game = wizardStorage.loadGame();
  if (!game || game.players.length === 0 || isGameFinished(game)) return null;
  if (!(game.gamemode in wizardGamemodes)) return null;
  return {
    gameKey: "wizard",
    gameName: "Wizard",
    emoji: WIZARD_EMOJI,
    href: `/wizard/${gamemodeSlug(game.gamemode)}`,
    modeName: wizardGamemodes[game.gamemode].name,
    players: game.players,
    progress: `Runde ${firstOpenRound(game) + 1} von ${game.totalRounds}`,
  };
}
