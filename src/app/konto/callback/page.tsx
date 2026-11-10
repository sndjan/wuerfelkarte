import type { Metadata } from "next";

import { AuthCallback } from "@/components/account/AuthCallback";

export const metadata: Metadata = { title: "Anmelden" };

export default function KontoCallbackPage() {
  return <AuthCallback />;
}
