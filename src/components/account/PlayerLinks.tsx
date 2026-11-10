"use client";

import type { User } from "@supabase/supabase-js";
import { Check, Link2, Loader2, Share2, X } from "lucide-react";
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
import { loadRoster } from "@/games/shared/roster";
import type { RosterPlayer } from "@/games/shared/types";
import { acceptLink, invitePlayer, removeLink } from "@/lib/links/api";
import type { PlayerLink } from "@/lib/links/share";
import { getSupabase } from "@/lib/supabase";
import { syncNow } from "@/lib/sync/client";
import { useSyncRefresh } from "@/lib/sync/useSyncRefresh";
import { openInvites, usePlayerLinks } from "./usePlayerLinks";

const BALOO = "font-[family-name:var(--font-baloo)]";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-card p-5">
      <div>
        <h3 className={`${BALOO} text-lg font-extrabold`}>{title}</h3>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const inviteText = (email: string, name: string) =>
  `Ich habe dich auf Würfelkarte als „${name}“ verknüpft. Melde dich mit ${email} an und nimm die Einladung an, dann landen unsere Spiele auch in deinem Verlauf: ${window.location.origin}/konto`;

function InviteDialog({
  player,
  current,
  onClose,
  onDone,
}: {
  player: RosterPlayer | null;
  current: PlayerLink | undefined;
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    setEmail(current?.inviteeEmail ?? "");
    setError(null);
    setSentTo(null);
  }, [player, current]);

  const send = async () => {
    const supabase = getSupabase();
    if (!supabase || !player) return;
    setSending(true);
    setError(null);
    const message = await invitePlayer(supabase, player.id, player.name, email);
    setSending(false);
    if (message) {
      setError(message);
      return;
    }
    setSentTo(email.trim().toLowerCase());
    onDone();
  };

  const share = async () => {
    if (!player || !sentTo) return;
    const text = inviteText(sentTo, player.name);
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
              ? `Sobald sich ${player?.name} mit ${sentTo} anmeldet, sieht er oder sie die Einladung unter „Konto“. Sag am besten kurz Bescheid.`
              : `Mit welcher E-Mail meldet sich ${player?.name} bei Würfelkarte an? Nach dem Annehmen landen eure gemeinsamen Spiele auch in seinem oder ihrem Verlauf.`}
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
              type="email"
              required
              autoComplete="off"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@beispiel.de"
              className="h-11 rounded-xl"
            />
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={sending}>
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
  const [inviting, setInviting] = useState<RosterPlayer | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setRoster(loadRoster()), []);
  useSyncRefresh(() => setRoster(loadRoster()));

  if (links.state === "loading") {
    return (
      <div className="flex justify-center py-4 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-label="Lädt" />
      </div>
    );
  }
  if (links.state === "unavailable") {
    return (
      <Section title="Mitspieler verknüpfen" hint="Das Verknüpfen mit anderen Konten ist noch nicht eingerichtet.">
        {null}
      </Section>
    );
  }
  if (links.state === "error") {
    return <p className="text-center text-sm text-muted-foreground">Verknüpfungen gerade nicht erreichbar.</p>;
  }

  const all = links.links;
  const invites = openInvites(all, user.id);
  const linkedToMe = all.filter((l) => l.status === "accepted" && l.inviteeId === user.id);
  const mine = new Map(all.filter((l) => l.ownerId === user.id).map((l) => [l.playerId, l]));

  const act = async (id: string, action: () => Promise<boolean>) => {
    setBusy(id);
    await action();
    await reload();
    setBusy(null);
    // An accepted invite starts the sharing; this side picks matches up on the next sync.
    void syncNow();
  };
  const supabase = getSupabase()!;

  return (
    <>
      {invites.length > 0 && (
        <Section title="Einladungen">
          {invites.map((invite) => (
            <div key={invite.id} className="flex flex-col gap-2 rounded-xl border p-3">
              <p className="text-sm">
                <b className="break-all">{invite.ownerEmail}</b> möchte dich als <b>„{invite.playerName}“</b>{" "}
                verknüpfen. Eure gemeinsamen Spiele landen dann auch in deinem Verlauf.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === invite.id}
                  onClick={() => void act(invite.id, () => acceptLink(supabase, invite.id))}
                >
                  <Check /> Annehmen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy === invite.id}
                  onClick={() => void act(invite.id, () => removeLink(supabase, invite.id))}
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
        hint="Verknüpfe Spieler aus deiner Liste mit ihrem Konto. Jedes Spiel mit ihnen landet dann auch in ihrem Verlauf, auch die bisherigen."
      >
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Spieler. Leg sie in einer Spiel-Lobby an.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {roster.map((player) => {
              const link = mine.get(player.id);
              return (
                <li key={player.id} className="flex items-center gap-3 py-2">
                  <span className="text-xl" aria-hidden="true">
                    {player.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{player.name}</p>
                    {link && (
                      <p className="truncate text-xs text-muted-foreground">
                        {link.status === "accepted" ? "✓ " : "Wartet auf "}
                        {link.inviteeEmail}
                      </p>
                    )}
                  </div>
                  {link ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Verknüpfung von ${player.name} lösen`}
                      disabled={busy === link.id}
                      onClick={() => void act(link.id, () => removeLink(supabase, link.id))}
                    >
                      <X />
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setInviting(player)}>
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
        <Section title="Mit dir verknüpft" hint="Ihre Spiele mit dir landen in deinem Verlauf.">
          <ul className="flex flex-col divide-y">
            {linkedToMe.map((link) => (
              <li key={link.id} className="flex items-center gap-3 py-2">
                <p className="min-w-0 flex-1 text-sm">
                  <span className="break-all font-bold">{link.ownerEmail}</span>
                  <span className="text-muted-foreground"> · als „{link.playerName}“</span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Verknüpfung mit ${link.ownerEmail} lösen`}
                  disabled={busy === link.id}
                  onClick={() => void act(link.id, () => removeLink(supabase, link.id))}
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
        current={inviting ? mine.get(inviting.id) : undefined}
        onClose={() => setInviting(null)}
        onDone={() => void reload()}
      />
    </>
  );
}
