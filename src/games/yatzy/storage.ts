import { createGameStorage } from "@/games/shared/storage";
import { StoredMatch } from "@/games/shared/types";
import { YatzyMatchPlayer } from "./types";

/** What Yatzy remembers between sessions: the seating and the two mode toggles. */
export type StoredYatzyPlayer = { name: string; emoji?: string };

export type YatzyMatch = StoredMatch<YatzyMatchPlayer>;

type YatzySettings = {
  /** Chaoswunder: rotate the mission every round instead of every second one. */
  missionEveryRound: boolean;
  /** Chaoswunder: draw a fixed difficulty mix instead of a free draw. */
  balancedMode: boolean;
};

/**
 * Yatzy keeps no running game — only who is at the table. The sheet itself
 * lives in the hook and is rebuilt from the player list on load.
 */
export const yatzyStorage = createGameStorage<
  StoredYatzyPlayer[],
  YatzyMatch,
  YatzySettings
>("yatzy", {
  defaultSettings: { missionEveryRound: false, balancedMode: false },
});

const PLAYERS_KEY = "yatzy:players";

/** Older versions stored bare names; newer ones store name plus emoji. */
type LegacyStoredPlayer = string | StoredYatzyPlayer;

export const loadPlayers = (): StoredYatzyPlayer[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as LegacyStoredPlayer[];
    if (!Array.isArray(stored)) return null;
    return stored.map((entry) =>
      typeof entry === "string" ? { name: entry } : entry,
    );
  } catch {
    return null;
  }
};

export const savePlayers = (players: StoredYatzyPlayer[]): void => {
  try {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  } catch {
    // Storage full or unavailable — the game keeps working.
  }
};

export const loadChaosSettings = () => yatzyStorage.loadSettings();

export const saveChaosSetting = (
  key: keyof YatzySettings,
  value: boolean,
): void => yatzyStorage.saveSettings({ [key]: value });
