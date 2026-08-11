import { createGameStorage } from "@/games/shared/storage";
import { createRound } from "./scoring";
import { CaboGame, StoredCaboMatch } from "./types";

type CaboSettings = {
  hideScores: boolean;
  /** The last target a group agreed on, so they keep their house rule. */
  targetScore: number | null;
};

export const caboStorage = createGameStorage<
  CaboGame,
  StoredCaboMatch,
  CaboSettings
>("cabo", {
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
  caboStorage.loadSettings().hideScores;

export const saveHideScoresSetting = (value: boolean): void =>
  caboStorage.saveSettings({ hideScores: value });

export const loadTargetScoreSetting = (): number | null =>
  caboStorage.loadSettings().targetScore;

export const saveTargetScoreSetting = (value: number): void =>
  caboStorage.saveSettings({ targetScore: value });
