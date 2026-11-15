import type { Metadata } from "next";

import { JoinGame } from "@/games/online/components/JoinGame";

export const metadata: Metadata = { title: "Kniffel Online – Einladung" };

export default async function JoinGamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinGame code={code} />;
}
