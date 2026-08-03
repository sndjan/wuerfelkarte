import { createRound } from "./scoring";
import { Flip7Game, StoredFlip7Match } from "./types";

export const FLIP7_GAME_STORAGE_KEY = "flip7:game";
/** Kept apart from Yatzy's and Wizard's history so no game pollutes the other's stats. */
export const FLIP7_MATCHES_STORAGE_KEY = "flip7:lastMatches";

export const loadFlip7Game = (): Flip7Game | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(FLIP7_GAME_STORAGE_KEY);
    if (!stored) return null;
    const game = JSON.parse(stored) as Flip7Game;
    if (!Array.isArray(game.players) || !Array.isArray(game.rounds)) return null;
    return {
      ...game,
      id: game.id ?? crypto.randomUUID(),
      // A game is never round-less: the open round is what the UI writes into.
      rounds:
        game.rounds.length > 0 ? game.rounds : [createRound(game.players)],
    };
  } catch {
    return null;
  }
};

export const saveFlip7Game = (game: Flip7Game) => {
  try {
    localStorage.setItem(FLIP7_GAME_STORAGE_KEY, JSON.stringify(game));
  } catch {
    // Handle storage errors silently
  }
};

export const clearFlip7Game = () => {
  try {
    localStorage.removeItem(FLIP7_GAME_STORAGE_KEY);
  } catch {
    // Handle storage errors silently
  }
};

export const loadFlip7Matches = (): StoredFlip7Match[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FLIP7_MATCHES_STORAGE_KEY);
    if (!stored) return [];
    const matches = JSON.parse(stored);
    return Array.isArray(matches) ? (matches as StoredFlip7Match[]) : [];
  } catch {
    return [];
  }
};

/**
 * Upsert by match id: a finished game that gets corrected — or resumed and
 * finished again — updates its own history entry instead of adding a second.
 */
export const saveFlip7Match = (match: StoredFlip7Match) => {
  try {
    const matches = loadFlip7Matches();
    const index = matches.findIndex((m) => m.id === match.id);
    if (index === -1) {
      matches.push(match);
    } else {
      matches[index] = match;
    }
    localStorage.setItem(FLIP7_MATCHES_STORAGE_KEY, JSON.stringify(matches));
  } catch {
    // Handle storage errors silently
  }
};

/** Dropped when a finished game is resumed — it is not a result any more. */
export const removeFlip7Match = (matchId: string) => {
  try {
    const matches = loadFlip7Matches().filter((m) => m.id !== matchId);
    localStorage.setItem(FLIP7_MATCHES_STORAGE_KEY, JSON.stringify(matches));
  } catch {
    // Handle storage errors silently
  }
};

const SETTINGS_STORAGE_KEY = "flip7:settings";

type Flip7Settings = { hideScores?: boolean; targetScore?: number };

const loadSettings = (): Flip7Settings => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveSettings = (settings: Flip7Settings) => {
  try {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...loadSettings(), ...settings }),
    );
  } catch {
    // Handle storage errors silently
  }
};

export const loadHideScoresSetting = (): boolean =>
  loadSettings().hideScores ?? false;

export const saveHideScoresSetting = (value: boolean) =>
  saveSettings({ hideScores: value });

/** The lobby remembers the last target so a group keeps its house rule. */
export const loadTargetScoreSetting = (): number | null =>
  loadSettings().targetScore ?? null;

export const saveTargetScoreSetting = (value: number) =>
  saveSettings({ targetScore: value });
