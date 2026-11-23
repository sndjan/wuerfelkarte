import type { Metadata } from "next";

import { ScanPage } from "@/games/scan/components/ScanPage";

export const metadata: Metadata = {
  title: "Papierblock",
  description: "Kniffel auf Papier spielen, das Blatt fotografieren und die Auswertung in der Würfelkarte bekommen.",
};

export default function Scan() {
  return <ScanPage />;
}
