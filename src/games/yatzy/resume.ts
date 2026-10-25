import { RunningGame } from "@/games/shared/resume";
import { YATZY_EMOJI, gamemodeSlug } from "./config";
import { gamemodes } from "./gamemodes";
import { isMatchComplete } from "./scoring";
import { yatzyStorage } from "./storage";

/**
 * The stored sheet once a first field is filled in — the board always has a
 * sheet, so an untouched one is not a game anyone left behind — and until the
 * last field is.
 */
export function runningYatzyGame(): RunningGame | null {
  const game = yatzyStorage.loadGame();
  if (!game || game.players.length === 0 || game.startedAt == null) return null;
  const gamemode = game.gamemode as keyof typeof gamemodes;
  if (isMatchComplete(game.players, gamemode)) return null;
  const fields = gamemodes[gamemode].fields;
  // Same count the Chaoswunder missions go by: a 0 is a field not played yet.
  const roundsPlayed = Math.min(
    ...game.players.map(
      (p) =>
        fields.filter((f) => p.points[f.key as keyof typeof p.points] !== 0)
          .length,
    ),
  );
  return {
    gameKey: "yatzy",
    gameName: "Yatzy",
    emoji: YATZY_EMOJI,
    href: `/yatzy/${gamemodeSlug(gamemode)}`,
    modeName: gamemodes[gamemode].name,
    players: game.players,
    progress: `Runde ${Math.min(roundsPlayed + 1, fields.length)} von ${fields.length}`,
  };
}
