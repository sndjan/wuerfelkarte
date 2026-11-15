import type { Metadata } from "next";

import { StatisticsPage } from "@/games/shared/components/StatisticsPage";

export const metadata: Metadata = { title: "Statistik" };

export default function StatistikPage() {
  return <StatisticsPage />;
}
