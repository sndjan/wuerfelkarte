import type { Metadata } from "next";

import { Training } from "@/games/training/components/Training";

export const metadata: Metadata = { title: "Training" };

export default function TrainingPage() {
  return <Training />;
}
