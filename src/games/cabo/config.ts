import type { ShareConfig } from "@/games/shared/components/ShareResult";
import { caboGamemodes } from "./gamemodes";
import { CaboGame, CaboGamemodeKey } from "./types";

export const CABO_EMOJI = "🃏";

export const shareConfig = (
  gamemode: CaboGamemodeKey,
  targetScore: number,
): ShareConfig => ({
  emoji: CABO_EMOJI,
  gameName: "Cabo",
  modeLabel: `${caboGamemodes[gamemode].name} · ${targetScore} Punkte`,
  imageTitle: `Cabo · ${targetScore}`,
  imageTitleFontSize: 76,
  fileSlug: "cabo",
  lowerIsBetter: true,
});

export const shareConfigFor = (game: CaboGame): ShareConfig =>
  shareConfig(game.gamemode, game.targetScore);
