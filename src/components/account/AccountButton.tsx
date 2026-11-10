"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/** Header entry to /konto; shows the account's initial once signed in. */
export function AccountButton() {
  const { user, available } = useAuth();
  if (!available) return null;

  const initial = user?.email?.charAt(0).toUpperCase();
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className={initial ? "rounded-full border-brand-accent bg-brand-accent font-extrabold text-white hover:bg-brand-accent/90 hover:text-white" : "rounded-full bg-white"}
    >
      <Link href="/konto" aria-label={initial ? "Konto und Synchronisierung" : "Anmelden"}>
        {initial ?? <UserRound />}
      </Link>
    </Button>
  );
}
