import type { Metadata } from "next";

import { Quiz } from "@/games/quiz/components/Quiz";

export const metadata: Metadata = { title: "Kniffel-Quiz" };

export default function QuizPage() {
  return <Quiz />;
}
