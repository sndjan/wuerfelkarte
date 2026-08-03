import { gamemodeFromSlug, wizardGamemodes } from "@/games/wizard/gamemodes";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gamemode: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const gamemode = gamemodeFromSlug(resolvedParams.gamemode);
  return {
    title: wizardGamemodes[gamemode].name,
  };
}

export default function WizardGamemodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
