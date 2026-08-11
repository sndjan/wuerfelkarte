import { ArrowRight, Eye, type LucideIcon } from "lucide-react";

import { gamemodeSlug } from "./config";
import { gamemodes } from "./gamemodes";
import { isMatchComplete } from "./scoring";
import { YatzyMatch } from "./storage";
import { Points } from "./types";

export type YatzyMatchActionInfo = {
  label: string;
  icon: LucideIcon;
  href: string;
};

/**
 * "Weiterspielen"/"Ergebnis" for a stored match — shared by the Yatzy lobby's
 * "Letzte Spiele" and the cross-game history page. `null` for matches saved
 * before the points field existed or whose gamemode no longer exists.
 */
export function yatzyMatchActionInfo(
  match: YatzyMatch,
): YatzyMatchActionInfo | null {
  if (!match.players.every((p) => p.points) || !(match.gamemode in gamemodes)) {
    return null;
  }
  const complete = isMatchComplete(
    match.players.map((p) => ({ points: p.points as Points })),
    match.gamemode as keyof typeof gamemodes,
  );
  return {
    label: complete ? "Ergebnis" : "Weiterspielen",
    icon: complete ? Eye : ArrowRight,
    href: `/yatzy/${gamemodeSlug(match.gamemode)}?matchId=${match.id}`,
  };
}
