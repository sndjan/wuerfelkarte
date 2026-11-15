"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { openInvites, usePlayerLinks } from "./usePlayerLinks";
import { useSelfPlayer } from "./useSelfPlayer";

/** Header entry to /konto; shows the account's character (else its initial) once signed in and a dot for open invites. */
export function AccountButton() {
  const { user, available } = useAuth();
  const { links } = usePlayerLinks(user?.id ?? null);
  const self = useSelfPlayer();
  if (!available) return null;

  const initial = user ? (self?.emoji ?? user.email?.charAt(0).toUpperCase()) : undefined;
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
            ? "size-11 rounded-full border-transparent bg-brand-soft text-xl font-extrabold hover:bg-brand-soft/80"
            : "size-11 rounded-full bg-surface"
        }
      >
        <Link
          href="/konto"
          aria-label={initial ? "Profil" : "Anmelden"}
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
