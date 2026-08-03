import { createGameStorage } from "@/games/shared/storage";
import { createRound } from "./scoring";
import { Flip7Game, StoredFlip7Match } from "./types";

type Flip7Settings = {
  hideScores: boolean;
  /** The last target a group agreed on, so they keep their house rule. */
  targetScore: number | null;
};

export const flip7Storage = createGameStorage<
  Flip7Game,
  StoredFlip7Match,
  Flip7Settings
>("flip7", {
  defaultSettings: { hideScores: false, targetScore: null },
  reviveGame: (game) => {
    if (!Array.isArray(game.players) || !Array.isArray(game.rounds)) return null;
    return {
      ...game,
      id: game.id ?? crypto.randomUUID(),
      // A game is never round-less: the open round is what the UI writes into.
      rounds: game.rounds.length > 0 ? game.rounds : [createRound(game.players)],
    };
  },
});

export const loadHideScoresSetting = (): boolean =>
  flip7Storage.loadSettings().hideScores;

export const saveHideScoresSetting = (value: boolean): void =>
  flip7Storage.saveSettings({ hideScores: value });

export const loadTargetScoreSetting = (): number | null =>
  flip7Storage.loadSettings().targetScore;

export const saveTargetScoreSetting = (value: number): void =>
  flip7Storage.saveSettings({ targetScore: value });
