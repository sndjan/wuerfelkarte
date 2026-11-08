import type { Metadata } from "next";

import { Speedrun } from "@/games/speedrun/components/Speedrun";

export const metadata: Metadata = { title: "Kniffel-Speedrun" };

export default function SpeedrunPage() {
  return <Speedrun />;
}
