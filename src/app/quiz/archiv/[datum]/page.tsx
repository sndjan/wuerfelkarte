import type { Metadata } from "next";

import { Quiz } from "@/games/quiz/components/Quiz";

export const metadata: Metadata = { title: "Kniffel-Quiz – Archiv" };

export default async function QuizArchiveDayPage({
  params,
}: {
  params: Promise<{ datum: string }>;
}) {
  const { datum } = await params;
  return <Quiz date={datum} />;
}
