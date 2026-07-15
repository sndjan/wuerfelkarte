import { gamemodes } from "@/components/gamemodes/gamemodes";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gamemode: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const param = resolvedParams.gamemode;
  const gamemode =
    (Object.keys(gamemodes).find(
      (key) =>
        key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ===
        param.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    ) as keyof typeof gamemodes) || "Klassiker";
  const titleGamemode = gamemodes[gamemode].name;
  return {
    title: `${titleGamemode}`,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
