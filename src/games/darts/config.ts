import type { ShareConfig } from "@/games/shared/components/ShareResult";
import { rulesLabel } from "./gamemodes";
import { DartsGame, DartsInRule, DartsOutRule } from "./types";

export const DARTS_EMOJI = "🎯";

export const shareConfig = (settings: {
  startScore: number;
  inRule: DartsInRule;
  outRule: DartsOutRule;
  legsToWin: number;
}): ShareConfig => ({
  emoji: DARTS_EMOJI,
  gameName: "Darts",
  modeLabel: rulesLabel(settings),
  imageTitle: `Darts · ${settings.startScore}`,
  imageTitleFontSize: 76,
  fileSlug: "darts",
});

export const shareConfigFor = (game: DartsGame): ShareConfig =>
  shareConfig(game);
