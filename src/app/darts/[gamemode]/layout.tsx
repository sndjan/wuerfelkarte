import { dartsGamemodes, gamemodeFromSlug } from "@/games/darts/gamemodes";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gamemode: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const gamemode = gamemodeFromSlug(resolvedParams.gamemode);
  return {
    title: `Darts · ${dartsGamemodes[gamemode].name}`,
  };
}

export default function DartsGamemodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
