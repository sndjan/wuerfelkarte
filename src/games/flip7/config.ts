import type { ShareConfig } from "@/games/shared/components/ShareResult";
import { flip7Gamemodes } from "./gamemodes";
import { Flip7Game, Flip7GamemodeKey } from "./types";

export const FLIP7_EMOJI = "7️⃣";

export const shareConfig = (
  gamemode: Flip7GamemodeKey,
  targetScore: number,
): ShareConfig => ({
  emoji: FLIP7_EMOJI,
  gameName: "Flip 7",
  modeLabel: `${flip7Gamemodes[gamemode].name} · ${targetScore} Punkte`,
  imageTitle: `Flip 7 · ${targetScore}`,
  imageTitleFontSize: 76,
  fileSlug: "flip7",
});

export const shareConfigFor = (game: Flip7Game): ShareConfig =>
  shareConfig(game.gamemode, game.targetScore);
