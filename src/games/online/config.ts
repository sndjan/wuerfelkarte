import { gamemodes } from "@/games/yatzy/gamemodes";
import type { DiceMode } from "./engine";
import type { GameRow, PlayerRow } from "./types";

export const ONLINE_EMOJI = "🌐";

export const diceModeLabel = (mode: DiceMode) => (mode === "digital" ? "digitale Würfel" : "echte Würfel");

export const gameLabel = (game: Pick<GameRow, "gamemode">) => gamemodes[game.gamemode]?.name ?? game.gamemode;

export const hostName = (game: GameRow & { online_game_players: PlayerRow[] }) =>
  game.online_game_players.find((p) => p.user_id === game.host_id)?.name ?? "Jemand";
