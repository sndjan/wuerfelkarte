import type { Metadata } from "next";

import { OnlineGame } from "@/games/online/components/OnlineGame";

export const metadata: Metadata = { title: "Kniffel Online" };

export default async function OnlineGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OnlineGame gameId={id} />;
}
