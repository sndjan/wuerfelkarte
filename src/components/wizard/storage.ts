import { StoredWizardMatch, WizardGame } from "./types";

export const WIZARD_GAME_STORAGE_KEY = "wizard:game";
/** Kept apart from Yatzy's `lastMatches` so neither game pollutes the other's stats. */
export const WIZARD_MATCHES_STORAGE_KEY = "wizard:lastMatches";

export const loadWizardGame = (): WizardGame | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(WIZARD_GAME_STORAGE_KEY);
    if (!stored) return null;
    const game = JSON.parse(stored) as WizardGame;
    if (!Array.isArray(game.players) || !Array.isArray(game.rounds)) return null;
    // Games saved before the Sonderkarten mode existed have no card list.
    return {
      ...game,
      specialCards: Array.isArray(game.specialCards) ? game.specialCards : [],
    };
  } catch {
    return null;
  }
};

export const saveWizardGame = (game: WizardGame) => {
  try {
    localStorage.setItem(WIZARD_GAME_STORAGE_KEY, JSON.stringify(game));
  } catch {
    // Handle storage errors silently
  }
};

export const clearWizardGame = () => {
  try {
    localStorage.removeItem(WIZARD_GAME_STORAGE_KEY);
  } catch {
    // Handle storage errors silently
  }
};

export const loadWizardMatches = (): StoredWizardMatch[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(WIZARD_MATCHES_STORAGE_KEY);
    if (!stored) return [];
    const matches = JSON.parse(stored);
    return Array.isArray(matches) ? (matches as StoredWizardMatch[]) : [];
  } catch {
    return [];
  }
};

export const saveWizardMatch = (match: StoredWizardMatch) => {
  try {
    const matches = loadWizardMatches();
    matches.push(match);
    localStorage.setItem(WIZARD_MATCHES_STORAGE_KEY, JSON.stringify(matches));
  } catch {
    // Handle storage errors silently
  }
};

const SETTINGS_STORAGE_KEY = "wizard:settings";

type WizardSettings = { hideScores?: boolean };

const loadSettings = (): WizardSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const loadHideScoresSetting = (): boolean =>
  loadSettings().hideScores ?? false;

export const saveHideScoresSetting = (value: boolean) => {
  try {
    const current = loadSettings();
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...current, hideScores: value }),
    );
  } catch {
    // Handle storage errors silently
  }
};
