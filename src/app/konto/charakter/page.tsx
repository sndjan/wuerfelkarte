import type { Metadata } from "next";

import { CharacterPage } from "@/components/account/CharacterPage";

export const metadata: Metadata = { title: "Charakter" };

export default function CharakterPage() {
  return <CharacterPage />;
}
