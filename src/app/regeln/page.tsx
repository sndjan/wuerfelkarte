import type { Metadata } from "next";

import { RulesPage } from "@/games/shared/components/RulesPage";

export const metadata: Metadata = {
  title: "Spielregeln",
  description: "Die Regeln aller Spiele und Modi der Würfelkarte: Kniffel-Varianten, Quiz, Speedrun, Wizard, Flip 7, Cabo und Darts.",
};

export default function RegelnPage() {
  return <RulesPage />;
}
