"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { hostName } from "../config";
import { useMyOnline } from "../hooks/useOnline";
import { ActiveGameCard } from "./ActiveGameCard";

/** On the home page: the online game this account is in, or open invites. */
export function OnlineBanner() {
  const { user } = useAuth();
  const online = useMyOnline();
  if (!user || online.state !== "ready") return null;
  if (online.active) {
    return (
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Online</h2>
        <ActiveGameCard game={online.active} userId={user.id} />
      </div>
    );
  }
  if (online.invites.length === 0) return null;
  const first = online.invites[0];
  return (
    <Link
      href="/online"
      className="mb-6 flex items-center justify-between gap-3 rounded-[20px] border-2 border-brand-accent bg-brand-accent/10 p-4"
    >
      <span className="font-bold">
        🌐 {hostName(first)} lädt dich zu Kniffel Online ein
        {online.invites.length > 1 && ` (+${online.invites.length - 1})`}
      </span>
      <span className="shrink-0 text-sm font-semibold">Ansehen →</span>
    </Link>
  );
}
