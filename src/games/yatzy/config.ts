import type { GameStats } from "@/games/shared/components/GamemodeStats";
import type { ShareConfig } from "@/games/shared/components/ShareResult";
import { tallyWins } from "@/games/shared/stats";
import { gamemodes } from "./gamemodes";
import { YatzyMatch } from "./storage";

export const YATZY_EMOJI = "🎲";

export const shareConfig = (gamemode: string): ShareConfig => ({
  emoji: YATZY_EMOJI,
  // The text header stays "Würfelkarte - Ergebnis": Yatzy is the original game
  // and never named itself in the share text.
  modeLabel: gamemode,
  imageTitle: gamemode.charAt(0).toUpperCase() + gamemode.slice(1),
  imageSrc: "/images/dice.png",
  fileSlug: "results",
});

/**
 * Yatzy's ranking is not plain wins ÷ games: with a handful of matches that
 * would put whoever won their only game on top. Every player starts with
 * `PRIOR_GAMES` imaginary games won at the rate pure chance would give them
 * (1 / players in their matches), so a short record sits near that baseline and
 * the real record takes over as matches accumulate.
 */
const PRIOR_GAMES = 5;

const adjustedWinRate = (wins: number, games: number, baseline: number) =>
  (wins + PRIOR_GAMES * baseline) / (games + PRIOR_GAMES);

export function buildStats(matches: YatzyMatch[]): GameStats {
  // Solo games have no opponent to beat, so they stay out of the ranking.
  const ranked = matches.filter((match) => match.players.length >= 2);
  const wins = tallyWins(ranked, { minPlayers: 2 });

  const expectedWins = new Map<string, number>();
  for (const match of ranked) {
    const share = 1 / match.players.length;
    for (const player of match.players) {
      expectedWins.set(
        player.name,
        (expectedWins.get(player.name) ?? 0) + share,
      );
    }
  }

  const entries = [...wins.values()]
    .map((tally) => {
      const baseline = (expectedWins.get(tally.name) ?? 0) / tally.games;
      return {
        name: tally.name,
        wins: tally.wins,
        games: tally.games,
        winRate: adjustedWinRate(tally.wins, tally.games, baseline),
      };
    })
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
    .slice(0, 3)
    .map(({ name, wins: playerWins, games, winRate }) => ({
      name,
      detail: `${playerWins} ${playerWins === 1 ? "Sieg" : "Siege"} / ${games} ${
        games === 1 ? "Spiel" : "Spiele"
      }, ${winRate.toLocaleString(undefined, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}`,
    }));

  return { sections: [{ label: "Ranking", entries }] };
}

export const gamemodeSlug = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Falls back to the first mode, so a mistyped URL never renders a broken board. */
export const gamemodeFromSlug = (slug: string): keyof typeof gamemodes => {
  const normalized = slug.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return (
    Object.keys(gamemodes).find((key) => gamemodeSlug(key) === normalized) ??
    Object.keys(gamemodes)[0]
  );
};
