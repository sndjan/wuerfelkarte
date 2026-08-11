import type { Metadata } from "next";

import { AllMatches } from "@/games/shared/components/AllMatches";

export const metadata: Metadata = { title: "Alle Spiele" };

export default function VerlaufPage() {
  return <AllMatches />;
}
