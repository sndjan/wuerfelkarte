import type { ShareConfig } from "@/games/shared/components/ShareResult";
import { wizardGamemodes } from "./gamemodes";
import { WizardGame, WizardGamemodeKey } from "./types";

export const WIZARD_EMOJI = "🧙";

export const modeLabel = (
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
): string =>
  plusMinusOne
    ? `${wizardGamemodes[gamemode].name} · Plus/Minus Eins`
    : wizardGamemodes[gamemode].name;

export const shareConfig = (
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
): ShareConfig => ({
  emoji: WIZARD_EMOJI,
  gameName: "Wizard",
  modeLabel: modeLabel(gamemode, plusMinusOne),
  imageTitle: modeLabel(gamemode, plusMinusOne),
  fileSlug: "wizard",
});

export const shareConfigFor = (game: WizardGame): ShareConfig =>
  shareConfig(game.gamemode, game.plusMinusOne);
