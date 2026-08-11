import type { ShareConfig } from "@/games/shared/components/ShareResult";
import { gamemodes } from "./gamemodes";

export const YATZY_EMOJI = "🎲";

export const shareConfig = (gamemode: string): ShareConfig => ({
  emoji: YATZY_EMOJI,
  // The text header stays "Würfelkarte - Ergebnis": Yatzy is the original game
  // and never named itself in the share text.
  modeLabel: gamemode,
  imageTitle: gamemode.charAt(0).toUpperCase() + gamemode.slice(1),
  imageSrc: "/images/dice.png",
  fileSlug: "results",
});

export const gamemodeSlug = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Falls back to the first mode, so a mistyped URL never renders a broken board. */
export const gamemodeFromSlug = (slug: string): keyof typeof gamemodes => {
  const normalized = slug.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return (
    Object.keys(gamemodes).find((key) => gamemodeSlug(key) === normalized) ??
    Object.keys(gamemodes)[0]
  );
};
