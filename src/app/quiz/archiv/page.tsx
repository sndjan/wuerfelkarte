import type { Metadata } from "next";

import { QuizArchive } from "@/games/quiz/components/QuizArchive";

export const metadata: Metadata = { title: "Tagesquiz – Archiv" };

export default function QuizArchivePage() {
  return <QuizArchive />;
}
