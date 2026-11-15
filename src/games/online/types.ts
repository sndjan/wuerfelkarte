import type { Cell, DiceMode, OnlineState } from "./engine";

/** Host plus up to five invited accounts. */
export const MAX_PLAYERS = 6;

export type GameStatus = "lobby" | "running" | "finished" | "cancelled";

/** A row of `online_games`. */
export type GameRow = {
  id: string;
  host_id: string;
  status: GameStatus;
  gamemode: string;
  dice_mode: DiceMode;
  settings: { missionEveryRound?: boolean; balancedMode?: boolean };
  /** For the invite link (/online/beitreten/<code>); null until the host shares one. */
  invite_code?: string | null;
  state: OnlineState | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type PlayerStatus = "invited" | "accepted" | "left";

/** A row of `online_game_players`. */
export type PlayerRow = {
  game_id: string;
  user_id: string;
  name: string;
  /** Empty for a guest without an account. */
  tag: string;
  /** The account's emoji, or the one a guest picked; missing before the online_player_emoji migration. */
  emoji?: string | null;
  status: PlayerStatus;
  active: boolean;
  invited_at: string;
  updated_at: string;
};

/** What an invite link shows before joining. */
export type LinkPreview = {
  gameId: string;
  host: string;
  gamemode: string;
  diceMode: DiceMode;
  players: string[];
  /** Whether the lobby still takes players. */
  open: boolean;
};

/** A linked account that can be invited. */
export type Candidate = { userId: string; name: string; tag: string; busy: boolean };

/** Everything the board can ask /api/online to do. */
export type OnlineAction =
  | { type: "candidates" }
  | {
      type: "create";
      gamemode: string;
      diceMode: DiceMode;
      invitees: string[];
      missionEveryRound?: boolean;
      balancedMode?: boolean;
    }
  | { type: "invite"; gameId: string; userIds: string[] }
  /** The host's invite link code, made on first ask. */
  | { type: "link"; gameId: string }
  /** What a link leads to; works without signing in. */
  | { type: "peek"; code: string }
  /** Joins the lobby behind a link; `name` (and `emoji`) for guests without a profile. */
  | { type: "join"; code: string; name?: string; emoji?: string }
  | { type: "respond"; gameId: string; accept: boolean }
  | { type: "start"; gameId: string }
  | { type: "roll"; gameId: string; keep: boolean[]; preset?: number[] }
  | { type: "score"; gameId: string; field: string; value?: Cell; extraWunder?: boolean }
  | { type: "correct"; gameId: string; userId: string; field: string; value: Cell }
  | { type: "leave"; gameId: string }
  | { type: "remove"; gameId: string; userId: string }
  | { type: "reveal"; gameId: string }
  | { type: "cancel"; gameId: string };
