"use client";

import { useAuth } from "@/lib/auth";
import { useMyOnline } from "../hooks/useOnline";
import { ActiveGameCard } from "./ActiveGameCard";
import { InviteCard } from "./OnlineHome";

/**
 * On the home page: the online game this account is in, or open invites to
 * accept right here — accepting goes straight into the game's lobby.
 */
export function OnlineBanner() {
  const { user } = useAuth();
  const online = useMyOnline();
  if (!user || online.state !== "ready") return null;
  if (!online.active && online.invites.length === 0) return null;
  return (
    <div className="mb-6 flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {online.active ? "Online" : "Einladung"}
      </h2>
      {online.active ? (
        <ActiveGameCard game={online.active} userId={user.id} />
      ) : (
        online.invites.map((game) => <InviteCard key={game.id} game={game} onDone={online.reload} />)
      )}
    </div>
  );
}
