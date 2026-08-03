import { createGameStorage } from "@/games/shared/storage";
import { StoredWizardMatch, WizardGame } from "./types";

type WizardSettings = { hideScores: boolean };

export const wizardStorage = createGameStorage<
  WizardGame,
  StoredWizardMatch,
  WizardSettings
>("wizard", {
  defaultSettings: { hideScores: false },
  reviveGame: (game) => {
    if (!Array.isArray(game.players) || !Array.isArray(game.rounds)) return null;
    return {
      ...game,
      id: game.id ?? crypto.randomUUID(),
      // Games saved before the Sonderkarten mode existed have no card list.
      specialCards: Array.isArray(game.specialCards) ? game.specialCards : [],
    };
  },
});

export const loadHideScoresSetting = (): boolean =>
  wizardStorage.loadSettings().hideScores;

export const saveHideScoresSetting = (value: boolean): void =>
  wizardStorage.saveSettings({ hideScores: value });
