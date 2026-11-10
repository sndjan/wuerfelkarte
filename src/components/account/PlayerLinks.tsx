"use client";

import type { User } from "@supabase/supabase-js";
import { Check, Link2, Loader2, Share2, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { activePlayers, loadRoster } from "@/games/shared/roster";
import type { RosterPlayer } from "@/games/shared/types";
import { acceptLink, invitePlayer, removeLink } from "@/lib/links/api";
import { loadSelfPlayerId, saveSelfPlayerId } from "@/lib/links/self";
import { handleOf, type PlayerLink, type Profile } from "@/lib/links/share";
import { getSupabase } from "@/lib/supabase";
import { syncNow } from "@/lib/sync/client";
import { useSyncRefresh } from "@/lib/sync/useSyncRefresh";
import { ProfileCard } from "./ProfileCard";
import { openInvites, usePlayerLinks } from "./usePlayerLinks";

const BALOO = "font-[family-name:var(--font-baloo)]";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-card p-5">
      <div>
        <h3 className={`${BALOO} text-lg font-extrabold`}>{title}</h3>
        {hint && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

const handleFor = (profiles: Map<string, Profile>, userId: string) => {
  const profile = profiles.get(userId);
  return profile ? handleOf(profile) : "Unbekannt";
};

function InviteDialog({
  player,
  current,
  ownHandle,
  isSelf,
  onClose,
  onInvited,
  onMarkSelf,
}: {
  player: RosterPlayer | null;
  current: string | undefined;
  ownHandle: string | null;
  isSelf: boolean;
  onClose: () => void;
  onInvited: () => void;
  onMarkSelf: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    setHandle(current ?? "");
    setError(null);
    setSentTo(null);
  }, [player, current]);

  const send = async () => {
    const supabase = getSupabase();
    if (!supabase || !player) return;
    setSending(true);
    setError(null);
    const message = await invitePlayer(
      supabase,
      player.id,
      player.name,
      handle,
    );
    setSending(false);
    if (message) {
      setError(message);
      return;
    }
    setSentTo(handle.trim());
    onInvited();
  };

  const share = async () => {
    if (!player) return;
    const text = `Ich habe dich auf Würfelkarte als „${player.name}“ eingeladen${ownHandle ? ` (von ${ownHandle})` : ""}. Nimm die Einladung unter ${window.location.origin}/konto an, dann landen unsere Spiele auch bei dir.`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // Cancelled share sheet — nothing to do.
    }
  };

  return (
    <Dialog open={player !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {player?.emoji} {player?.name} verknüpfen
          </DialogTitle>
          <DialogDescription>
            {sentTo
              ? `${sentTo} sieht die Einladung unter „Konto“. Nach dem Annehmen heißt ${player?.name} bei dir überall wie im Konto, und eure Spiele landen auch dort.`
              : `Gib die Konto-ID von ${player?.name} ein. Sie steht bei ihm oder ihr ganz oben unter „Konto“.`}
          </DialogDescription>
        </DialogHeader>
        {sentTo ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Fertig
            </Button>
            <Button type="button" onClick={() => void share()}>
              <Share2 /> Bescheid sagen
            </Button>
          </DialogFooter>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <Input
              required
              autoComplete="off"
              autoCapitalize="off"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="Name#1234"
              className="h-11 rounded-xl"
            />
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2">
              {!isSelf && !current && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onMarkSelf}
                  className="sm:mr-auto"
                >
                  <UserRound /> Das bin ich
                </Button>
              )}
              <Button type="submit" disabled={sending || !handle.trim()}>
                {sending ? <Loader2 className="animate-spin" /> : <Link2 />}
                Einladen
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PlayerLinks({ user }: { user: User }) {
  const { links, reload } = usePlayerLinks(user.id);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [inviting, setInviting] = useState<RosterPlayer | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const readLocal = () => {
    setRoster(loadRoster());
    setSelfId(loadSelfPlayerId());
  };
  useEffect(readLocal, []);
  // Renames from the sync show up here right away.
  useSyncRefresh(readLocal);

  if (links.state === "loading") {
    return (
      <div className="flex justify-center py-4 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-label="Lädt" />
      </div>
    );
  }
  if (links.state === "unavailable") {
    return (
      <Section
        title="Mitspieler verknüpfen"
        hint="Das Verknüpfen mit anderen Konten ist noch nicht eingerichtet."
      />
    );
  }
  if (links.state === "error") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Verknüpfungen gerade nicht erreichbar.
      </p>
    );
  }

  const { profiles } = links;
  const own = profiles.get(user.id);
  const invites = openInvites(links.links, user.id);
  const linkedToMe = links.links.filter(
    (l) => l.status === "accepted" && l.inviteeId === user.id,
  );
  const mine = new Map(
    links.links
      .filter((l) => l.ownerId === user.id)
      .map((l) => [l.playerId, l]),
  );
  const supabase = getSupabase()!;
  const suggestedName =
    roster.find((p) => p.id === selfId)?.name ??
    activePlayers(roster)[0]?.name ??
    "";

  const act = async (id: string, action: () => Promise<boolean>) => {
    setBusy(id);
    await action();
    await reload();
    setBusy(null);
    // Runs the renames and starts or stops sharing.
    void syncNow();
  };

  const markSelf = (id: string | null) => {
    saveSelfPlayerId(id);
    setSelfId(id);
    setInviting(null);
    void syncNow();
  };

  const status = (link: PlayerLink) =>
    link.status === "accepted"
      ? `✓ ${handleFor(profiles, link.inviteeId)}`
      : `Wartet auf ${handleFor(profiles, link.inviteeId)}`;

  return (
    <>
      <ProfileCard
        key={own ? handleOf(own) : "new"}
        profile={own}
        suggestedName={suggestedName}
        onSaved={() => void reload()}
      />

      {invites.length > 0 && (
        <Section title="Einladungen">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-col gap-2 rounded-xl border p-3"
            >
              <p className="text-sm">
                <b>{handleFor(profiles, invite.ownerId)}</b> hat dich als{" "}
                <b>„{invite.playerName}“</b> in der Spielerliste. Nimmst du an,
                heißt du dort{" "}
                {own ? <b>„{own.name}“</b> : "wie in deinem Konto"} und eure
                gemeinsamen Spiele landen auch bei dir.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === invite.id}
                  onClick={() =>
                    void act(invite.id, () => acceptLink(supabase, invite.id))
                  }
                >
                  <Check /> Annehmen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy === invite.id}
                  onClick={() =>
                    void act(invite.id, () => removeLink(supabase, invite.id))
                  }
                >
                  Ablehnen
                </Button>
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section
        title="Mitspieler verknüpfen"
        hint="Verknüpfe Spieler aus deiner Liste mit ihrem Konto. Sie heißen dann überall so wie dort, und jedes Spiel mit ihnen landet auch bei ihnen, auch die bisherigen."
      >
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Spieler. Leg sie in einer Spiel-Lobby an.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {roster.map((player) => {
              const link = mine.get(player.id);
              const isSelf = player.id === selfId;
              return (
                <li key={player.id} className="flex items-center gap-3 py-2">
                  <span className="text-xl" aria-hidden="true">
                    {player.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{player.name}</p>
                    {(link || isSelf) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {isSelf
                          ? `Du${own ? ` · ${handleOf(own)}` : ""}`
                          : status(link!)}
                      </p>
                    )}
                  </div>
                  {isSelf ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${player.name} nicht mehr als dich markieren`}
                      onClick={() => markSelf(null)}
                    >
                      <X />
                    </Button>
                  ) : link ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Verknüpfung von ${player.name} lösen`}
                      disabled={busy === link.id}
                      onClick={() =>
                        void act(link.id, () => removeLink(supabase, link.id))
                      }
                    >
                      <X />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setInviting(player)}
                    >
                      <Link2 /> Verknüpfen
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {linkedToMe.length > 0 && (
        <Section
          title="Mit dir verknüpft"
          hint="Ihre Spiele mit dir landen in deinem Verlauf."
        >
          <ul className="flex flex-col divide-y">
            {linkedToMe.map((link) => (
              <li key={link.id} className="flex items-center gap-3 py-2">
                <p className="min-w-0 flex-1 truncate text-sm font-bold">
                  {handleFor(profiles, link.ownerId)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Verknüpfung mit ${handleFor(profiles, link.ownerId)} lösen`}
                  disabled={busy === link.id}
                  onClick={() =>
                    void act(link.id, () => removeLink(supabase, link.id))
                  }
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <InviteDialog
        player={inviting}
        current={
          inviting
            ? mine.get(inviting.id)
              ? handleFor(profiles, mine.get(inviting.id)!.inviteeId)
              : undefined
            : undefined
        }
        ownHandle={own ? handleOf(own) : null}
        isSelf={inviting?.id === selfId}
        onClose={() => setInviting(null)}
        onInvited={() => void reload()}
        onMarkSelf={() => inviting && markSelf(inviting.id)}
      />
    </>
  );
}
