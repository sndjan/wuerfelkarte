import { createGameStorage } from "@/games/shared/storage";
import {
  DEFAULT_IN_RULE,
  DEFAULT_LEGS_TO_WIN,
  DEFAULT_OUT_RULE,
  DEFAULT_START_SCORE,
  createLeg,
} from "./scoring";
import {
  DartsGame,
  DartsInRule,
  DartsOutRule,
  StoredDartsMatch,
} from "./types";

type DartsSettings = {
  /** The setup a group last agreed on, so their house rules come back. */
  startScore: number | null;
  inRule: DartsInRule | null;
  outRule: DartsOutRule | null;
  legsToWin: number | null;
  /**
   * Wide screens get the clickable board by default; "keypad" is the explicit
   * choice to keep typing instead. Phones always use the keypad.
   */
  inputMode: "board" | "keypad";
};

export const dartsStorage = createGameStorage<
  DartsGame,
  StoredDartsMatch,
  DartsSettings
>("darts", {
  defaultSettings: {
    startScore: null,
    inRule: null,
    outRule: null,
    legsToWin: null,
    inputMode: "board",
  },
  reviveGame: (game) => {
    if (!Array.isArray(game.players) || !Array.isArray(game.legs)) return null;
    return {
      ...game,
      id: game.id ?? crypto.randomUUID(),
      startScore: game.startScore ?? DEFAULT_START_SCORE,
      inRule: game.inRule ?? DEFAULT_IN_RULE,
      outRule: game.outRule ?? DEFAULT_OUT_RULE,
      legsToWin: game.legsToWin ?? DEFAULT_LEGS_TO_WIN,
      // A game is never leg-less: the open leg is what the board writes into.
      legs: game.legs.length > 0 ? game.legs : [createLeg(0, game.players.length)],
    };
  },
});

export type DartsSetupSettings = {
  startScore: number | null;
  inRule: DartsInRule | null;
  outRule: DartsOutRule | null;
  legsToWin: number | null;
};

export const loadSetupSettings = (): DartsSetupSettings => {
  const { startScore, inRule, outRule, legsToWin } = dartsStorage.loadSettings();
  return { startScore, inRule, outRule, legsToWin };
};

export const saveSetupSettings = (settings: {
  startScore: number;
  inRule: DartsInRule;
  outRule: DartsOutRule;
  legsToWin: number;
}): void => dartsStorage.saveSettings(settings);

export const loadInputModeSetting = (): "board" | "keypad" =>
  dartsStorage.loadSettings().inputMode;

export const saveInputModeSetting = (value: "board" | "keypad"): void =>
  dartsStorage.saveSettings({ inputMode: value });
