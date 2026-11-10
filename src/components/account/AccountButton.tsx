"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { openInvites, usePlayerLinks } from "./usePlayerLinks";

/** Header entry to /konto; shows the account's initial once signed in and a dot for open invites. */
export function AccountButton() {
  const { user, available } = useAuth();
  const { links } = usePlayerLinks(user?.id ?? null);
  if (!available) return null;

  const initial = user?.email?.charAt(0).toUpperCase();
  const invited =
    Boolean(user) &&
    links.state === "ready" &&
    openInvites(links.links, user!.id).length > 0;
  return (
    <span className="relative">
      <Button
        asChild
        variant="outline"
        size="icon"
        className={
          initial
            ? "rounded-full border-brand-accent bg-brand-accent font-extrabold text-white hover:bg-brand-accent/90 hover:text-white"
            : "rounded-full bg-white"
        }
      >
        <Link
          href="/konto"
          aria-label={initial ? "Konto und Synchronisierung" : "Anmelden"}
        >
          {initial ?? <UserRound />}
        </Link>
      </Button>
      {invited && (
        <span
          className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-brand-badge"
          aria-label="Neue Einladung"
        />
      )}
    </span>
  );
}
