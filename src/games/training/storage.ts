import { createGameStorage } from "@/games/shared/storage";
import { TURNS } from "./game";
import type { StoredTrainingMatch, TrainingGame } from "./types";

// A game from an unknown shape is dropped rather than repaired.
const reviveGame = (game: TrainingGame | null | undefined): TrainingGame | null =>
  typeof game?.id === "string" &&
  game.card !== null &&
  typeof game.card === "object" &&
  Array.isArray(game.turns) &&
  game.turns.length <= TURNS &&
  Array.isArray(game.current?.dice) &&
  game.current.dice.length === 5 &&
  Array.isArray(game.current.steps)
    ? game
    : null;

export const trainingStorage = createGameStorage<TrainingGame, StoredTrainingMatch, object>(
  "training",
  { defaultSettings: {}, reviveGame },
);
