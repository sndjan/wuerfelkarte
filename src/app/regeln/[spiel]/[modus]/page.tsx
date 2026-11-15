import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { findRules, ruleGames } from "@/games/rules";
import { ModeRules } from "@/games/shared/components/ModeRules";

type Params = { spiel: string; modus: string };

export function generateStaticParams(): Params[] {
  return ruleGames.flatMap((game) => game.modes.map((mode) => ({ spiel: game.key, modus: mode.slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { spiel, modus } = await params;
  const found = findRules(spiel, modus);
  if (!found) return {};
  const title =
    found.game.name === found.mode.name ? `Regeln ${found.game.name}` : `Regeln ${found.game.name} ${found.mode.name}`;
  return { title, description: found.mode.description };
}

export default async function ModeRulesPage({ params }: { params: Promise<Params> }) {
  const { spiel, modus } = await params;
  const found = findRules(spiel, modus);
  if (!found) notFound();
  return <ModeRules game={found.game} mode={found.mode} />;
}
