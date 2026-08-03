import type { GameStats } from "@/games/shared/components/GamemodeStats";
import type { ShareConfig } from "@/games/shared/components/ShareResult";
import {
  rateDetail,
  sumByPlayer,
  tallyWins,
  topThree,
} from "@/games/shared/stats";
import { flip7Gamemodes } from "./gamemodes";
import { Flip7Game, Flip7GamemodeKey, StoredFlip7Match } from "./types";

export const FLIP7_EMOJI = "7️⃣";

export const shareConfig = (
  gamemode: Flip7GamemodeKey,
  targetScore: number,
): ShareConfig => ({
  emoji: FLIP7_EMOJI,
  gameName: "Flip 7",
  modeLabel: `${flip7Gamemodes[gamemode].name} · ${targetScore} Punkte`,
  imageTitle: `Flip 7 · ${targetScore}`,
  imageTitleFontSize: 76,
  fileSlug: "flip7",
});

export const shareConfigFor = (game: Flip7Game): ShareConfig =>
  shareConfig(game.gamemode, game.targetScore);

/** Flip 7 ranks by wins, by how often people reach a Flip 7, and by busts. */
export function buildStats(matches: StoredFlip7Match[]): GameStats {
  const wins = tallyWins(matches);
  const rounds = sumByPlayer(matches, (p) => p.roundsPlayed);
  const flip7s = sumByPlayer(matches, (p) => p.flip7s);
  const busts = sumByPlayer(matches, (p) => p.busts);

  let bestRound: { name: string; score: number } | null = null;
  for (const match of matches) {
    for (const player of match.players) {
      if (!bestRound || player.bestRound > bestRound.score) {
        bestRound = { name: player.name, score: player.bestRound };
      }
    }
  }

  const withRounds = [...rounds.entries()].filter(([, count]) => count > 0);

  const winners = topThree(
    [...wins.values()].map((tally) => ({
      name: tally.name,
      rate: tally.games === 0 ? 0 : tally.wins / tally.games,
      count: tally.wins,
      detail: rateDetail(tally.wins, tally.games),
    })),
  );

  const flippers = topThree(
    withRounds
      .map(([name, played]) => {
        const hits = flip7s.get(name) ?? 0;
        return {
          name,
          rate: hits / played,
          count: hits,
          detail: rateDetail(hits, played),
        };
      })
      .filter((row) => row.count > 0),
  );

  // Fewest busts wins here, so the medals go to the ascending end.
  const safest = topThree(
    withRounds.map(([name, played]) => {
      const hits = busts.get(name) ?? 0;
      return {
        name,
        rate: hits / played,
        count: hits,
        detail: rateDetail(hits, played),
      };
    }),
    "asc",
  );

  return {
    tiles:
      bestRound && bestRound.score > 0
        ? [
            {
              label: "Beste Runde",
              value: `${bestRound.score} · ${bestRound.name}`,
            },
          ]
        : [],
    sections: [
      { label: "Siegquote", entries: winners },
      { label: "Flip-7-Quote", entries: flippers },
      { label: "Verzock-Quote (weniger ist besser)", entries: safest },
    ],
  };
}
