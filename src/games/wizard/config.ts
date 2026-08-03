import type { GameStats } from "@/games/shared/components/GamemodeStats";
import type { ShareConfig } from "@/games/shared/components/ShareResult";
import {
  rateDetail,
  sumByPlayer,
  tallyWins,
  topThree,
} from "@/games/shared/stats";
import { wizardGamemodes } from "./gamemodes";
import { StoredWizardMatch, WizardGame, WizardGamemodeKey } from "./types";

export const WIZARD_EMOJI = "🧙";

export const modeLabel = (
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
): string =>
  plusMinusOne
    ? `${wizardGamemodes[gamemode].name} · Plus/Minus Eins`
    : wizardGamemodes[gamemode].name;

export const shareConfig = (
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
): ShareConfig => ({
  emoji: WIZARD_EMOJI,
  gameName: "Wizard",
  modeLabel: modeLabel(gamemode, plusMinusOne),
  imageTitle: modeLabel(gamemode, plusMinusOne),
  fileSlug: "wizard",
});

export const shareConfigFor = (game: WizardGame): ShareConfig =>
  shareConfig(game.gamemode, game.plusMinusOne);

/** Wizard ranks by wins and by how often a prediction was exactly right. */
export function buildStats(matches: StoredWizardMatch[]): GameStats {
  const wins = tallyWins(matches);
  const rounds = sumByPlayer(matches, (p) => p.roundsPlayed);
  const exactBids = sumByPlayer(matches, (p) => p.exactBids);

  const winners = topThree(
    [...wins.values()].map((tally) => ({
      name: tally.name,
      rate: tally.games === 0 ? 0 : tally.wins / tally.games,
      count: tally.wins,
      detail: rateDetail(tally.wins, tally.games),
    })),
  );

  const predictors = topThree(
    [...rounds.entries()]
      .filter(([, played]) => played > 0)
      .map(([name, played]) => {
        const hits = exactBids.get(name) ?? 0;
        return {
          name,
          rate: hits / played,
          count: hits,
          detail: rateDetail(hits, played),
        };
      }),
  );

  return {
    sections: [
      { label: "Siegquote", entries: winners },
      { label: "Vorhersage-Genauigkeit", entries: predictors },
    ],
  };
}
