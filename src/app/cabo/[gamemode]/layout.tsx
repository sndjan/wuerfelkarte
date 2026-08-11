import { caboGamemodes, gamemodeFromSlug } from "@/games/cabo/gamemodes";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gamemode: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const gamemode = gamemodeFromSlug(resolvedParams.gamemode);
  return {
    title: `Cabo · ${caboGamemodes[gamemode].name}`,
  };
}

export default function CaboGamemodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
