import { flip7Gamemodes, gamemodeFromSlug } from "@/components/flip7/gamemodes";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gamemode: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const gamemode = gamemodeFromSlug(resolvedParams.gamemode);
  return {
    title: `Flip 7 · ${flip7Gamemodes[gamemode].name}`,
  };
}

export default function Flip7GamemodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
