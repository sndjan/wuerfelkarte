import type { Metadata } from "next";

import { AccountPage } from "@/components/account/AccountPage";

export const metadata: Metadata = { title: "Konto" };

export default function KontoPage() {
  return <AccountPage />;
}
