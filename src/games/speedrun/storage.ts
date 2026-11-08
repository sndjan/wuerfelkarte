import { createGameStorage, readJSON, writeJSON } from "@/games/shared/storage";
import { TURNS } from "@/games/training/game";
import type { SpeedrunCategory, SpeedrunGame, StoredSpeedrunMatch } from "./types";

export type SpeedrunSettings = {
  /** The category the start screen opens on. */
  category: SpeedrunCategory;
};

const CATEGORY_KEYS: SpeedrunCategory[] = ["any", "classic", "daily"];

// A run from an unknown shape is dropped rather than repaired.
const reviveGame = (game: SpeedrunGame | null | undefined): SpeedrunGame | null =>
  typeof game?.id === "string" &&
  typeof game.seed === "string" &&
  CATEGORY_KEYS.includes(game.category) &&
  game.card !== null &&
  typeof game.card === "object" &&
  Array.isArray(game.turns) &&
  game.turns.length <= TURNS &&
  Array.isArray(game.turnEnds) &&
  game.turnEnds.length === game.turns.length &&
  Array.isArray(game.current?.dice) &&
  game.current.dice.length === 5 &&
  Array.isArray(game.current.steps)
    ? game
    : null;

export const speedrunStorage = createGameStorage<SpeedrunGame, StoredSpeedrunMatch, SpeedrunSettings>(
  "speedrun",
  { defaultSettings: { category: "classic" }, reviveGame },
);

const DAILY_KEY = "speedrun:daily";

/**
 * The last day a ranked Tagesrun was started. Set at the start, not the
 * finish: an abandoned ranked run uses up the day, so nobody can look at the
 * dice and start over.
 */
export const dailyAttempted = (date: string) => readJSON<string | null>(DAILY_KEY, null) === date;

export const markDailyAttempted = (date: string) => writeJSON(DAILY_KEY, date);
