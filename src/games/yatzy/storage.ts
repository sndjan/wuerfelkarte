import { createGameStorage, writeJSON } from "@/games/shared/storage";
import { StoredMatch } from "@/games/shared/types";
import { gamemodes } from "./gamemodes";
import { Mission } from "./gamemodes/chaoswunder";
import { Points, YatzyMatchPlayer } from "./types";

/** The seating the lobby hands to the board for a fresh sheet. */
export type StoredYatzyPlayer = { name: string; emoji?: string };

export type YatzyMatch = StoredMatch<YatzyMatchPlayer>;

/** The sheet on the table, kept so a reload or a closed browser loses nothing. */
export type YatzyGame = {
  /** The match id it is recorded under once the scoreboard is opened. */
  id: string;
  gamemode: string;
  players: {
    name: string;
    emoji?: string;
    points: Points;
    /** Battle only: field keys that counted double for this player. */
    doubled?: string[];
  }[];
  startedAt: number | null;
  finishedAt: number | null;
  /** Chaoswunder: the drawn missions, so a reload does not redraw them. */
  missions?: Mission[];
};

/** Reopening a past match from the history turns it back into a sheet. */
export const gameFromMatch = (match: YatzyMatch): YatzyGame => {
  const endedAt = new Date(match.timestamp).getTime();
  return {
    id: match.id,
    gamemode: match.gamemode,
    players: match.players.map((p) => ({
      name: p.name,
      emoji: p.emoji,
      points: p.points as Points,
      doubled: p.doubled,
    })),
    // The original duration is kept until it's played further, instead of
    // showing none or restarting the clock.
    startedAt: match.durationMs != null ? endedAt - match.durationMs : null,
    finishedAt: match.durationMs != null ? endedAt : null,
  };
};

type YatzySettings = {
  /** Chaoswunder: rotate the mission every round instead of every second one. */
  missionEveryRound: boolean;
  /** Chaoswunder: draw a fixed difficulty mix instead of a free draw. */
  balancedMode: boolean;
  /** Kept for stored settings; the score table has no separate compact layout any more. */
  compactMode: boolean;
  /** Covers every total („•••“) until the scoreboard; the bonus stays visible. */
  hideScores: boolean;
};

export const yatzyStorage = createGameStorage<
  YatzyGame,
  YatzyMatch,
  YatzySettings
>("yatzy", {
  defaultSettings: {
    missionEveryRound: false,
    balancedMode: false,
    compactMode: false,
    hideScores: false,
  },
  reviveGame: (game) => {
    if (!Array.isArray(game.players) || !(game.gamemode in gamemodes)) return null;
    if (!game.players.every((p) => p && typeof p.points === "object")) return null;
    return { ...game, id: game.id ?? crypto.randomUUID() };
  },
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

export const savePlayers = (players: StoredYatzyPlayer[]): void =>
  writeJSON(PLAYERS_KEY, players);

export const loadChaosSettings = () => yatzyStorage.loadSettings();

export const saveChaosSetting = (
  key: keyof YatzySettings,
  value: boolean,
): void => yatzyStorage.saveSettings({ [key]: value });

export const loadHideScores = (): boolean => yatzyStorage.loadSettings().hideScores;

export const saveHideScores = (value: boolean): void => yatzyStorage.saveSettings({ hideScores: value });

