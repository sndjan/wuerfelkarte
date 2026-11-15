import type { Metadata } from "next";

import { Speedrun } from "@/games/speedrun/components/Speedrun";

export const metadata: Metadata = { title: "Speedrun" };

export default function SpeedrunPage() {
  return <Speedrun />;
}
