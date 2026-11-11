import type { Metadata } from "next";

import { OnlineHome } from "@/games/online/components/OnlineHome";

export const metadata: Metadata = { title: "Kniffel Online" };

export default function OnlinePage() {
  return <OnlineHome />;
}
