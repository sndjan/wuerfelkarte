import { MatchPlayer, StoredMatch } from "./types";

/**
 * localStorage plumbing shared by every game.
 *
 * All access is SSR-safe and swallows errors: a full quota or a disabled
 * storage must never take the app down mid-game — the worst case is that a
 * result is not remembered.
 */

export const APP_NAMESPACE = "wuerfelkarte";

export const readJSON = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeJSON = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — nothing useful to do here.
  }
};

export const removeKey = (key: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // See above.
  }
};

export type GameStorage<
  TGame,
  TMatch extends StoredMatch<MatchPlayer>,
  TSettings extends object,
> = {
  readonly gameKey: string;
  readonly matchesKey: string;
  readonly settingsKey: string;

  loadGame(): TGame | null;
  saveGame(game: TGame): void;
  clearGame(): void;

  loadMatches(): TMatch[];
  /** Upsert by match id, so re-finishing a game updates its entry. */
  saveMatch(match: TMatch): void;
  /** Dropped when a finished game is resumed — it is not a result any more. */
  removeMatch(matchId: string): void;

  loadSettings(): TSettings;
  saveSettings(patch: Partial<TSettings>): void;
};

type CreateOptions<TGame, TSettings> = {
  /**
   * Repairs a stored game before it reaches the app — used for shapes written
   * by older versions (a missing id, a game without its open round).
   * Returning `null` rejects the payload and starts fresh.
   */
  reviveGame?: (raw: TGame) => TGame | null;
  defaultSettings: TSettings;
};

/**
 * Builds the storage module for one game. Keys are namespaced by the game's
 * own name (`wizard:game`, `wizard:matches`, `wizard:settings`) so no game
 * ever pollutes another's history or statistics.
 */
export function createGameStorage<
  TGame,
  TMatch extends StoredMatch<MatchPlayer>,
  TSettings extends object,
>(
  namespace: string,
  { reviveGame, defaultSettings }: CreateOptions<TGame, TSettings>,
): GameStorage<TGame, TMatch, TSettings> {
  const gameKey = `${namespace}:game`;
  const matchesKey = `${namespace}:matches`;
  const settingsKey = `${namespace}:settings`;

  const loadMatches = (): TMatch[] => {
    const matches = readJSON<TMatch[]>(matchesKey, []);
    return Array.isArray(matches) ? matches : [];
  };

  const loadSettings = (): TSettings => ({
    ...defaultSettings,
    ...readJSON<Partial<TSettings>>(settingsKey, {}),
  });

  return {
    gameKey,
    matchesKey,
    settingsKey,

    loadGame() {
      const raw = readJSON<TGame | null>(gameKey, null);
      if (raw === null) return null;
      return reviveGame ? reviveGame(raw) : raw;
    },
    saveGame: (game) => writeJSON(gameKey, game),
    clearGame: () => removeKey(gameKey),

    loadMatches,
    saveMatch(match) {
      const matches = loadMatches();
      const index = matches.findIndex((m) => m.id === match.id);
      if (index === -1) matches.push(match);
      else matches[index] = match;
      writeJSON(matchesKey, matches);
    },
    removeMatch(matchId) {
      writeJSON(
        matchesKey,
        loadMatches().filter((m) => m.id !== matchId),
      );
    },

    loadSettings,
    saveSettings: (patch) => writeJSON(settingsKey, { ...loadSettings(), ...patch }),
  };
}
