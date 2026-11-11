"use client";

import type { User } from "@supabase/supabase-js";
import { Check, Link2, Loader2, Share2, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activePlayers, loadRoster, saveRoster } from "@/games/shared/roster";
import type { RosterPlayer } from "@/games/shared/types";
import {
  acceptLink,
  invitePlayer,
  linkBack,
  removeLink,
} from "@/lib/links/api";
import { entryFor, linkedEntries } from "@/lib/links/entries";
import { loadSelfPlayerId, saveSelfPlayerId } from "@/lib/links/self";
import {
  handleOf,
  sameName,
  type PlayerLink,
  type Profile,
} from "@/lib/links/share";
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

/**
 * Opens in place under the player's row. Dialogs sit awkwardly on a phone
 * (keyboard over the input, a dimmed page), so the account page has none.
 */
function InviteForm({
  player,
  ownHandle,
  onClose,
  onInvited,
  onMarkSelf,
}: {
  player: RosterPlayer;
  ownHandle: string | null;
  onClose: () => void;
  onInvited: () => void;
  onMarkSelf: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
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
    const text = `Nimm meine Würfelkarte-Einladung an${ownHandle ? ` (${ownHandle})` : ""}: ${window.location.origin}/konto`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // Cancelled share sheet — nothing to do.
    }
  };

  if (sentTo) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-background p-3">
        <p className="text-sm leading-relaxed">
          <b>{sentTo}</b> eingeladen.
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => void share()}>
            <Share2 /> Teilen
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Fertig
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-xl bg-background p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <div className="flex items-center justify-between">
        <label htmlFor={`invite-${player.id}`} className="text-xs font-bold">
          Konto-ID von {player.name}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-my-2 -mr-2"
          aria-label="Abbrechen"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <Input
        id={`invite-${player.id}`}
        required
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        value={handle}
        onChange={(event) => setHandle(event.target.value)}
        placeholder="Name#1234"
        className="h-11 rounded-xl bg-card text-base font-normal"
      />
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={sending || !handle.trim()}>
          {sending ? <Loader2 className="animate-spin" /> : <Link2 />}
          Einladen
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onMarkSelf}>
          <UserRound /> Das bin ich
        </Button>
      </div>
    </form>
  );
}

const NEW_ENTRY = "new";

/** "Wer ist das?": an existing roster entry for the inviter, or a new one. */
function WhoIsIt({
  options,
  value,
  onChange,
}: {
  options: RosterPlayer[];
  value: string;
  onChange: (id: string) => void;
}) {
  const chip = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      role="radio"
      aria-checked={value === id}
      onClick={() => onChange(id)}
      className={
        value === id
          ? "h-9 rounded-full bg-primary px-3 text-sm font-bold text-primary-foreground"
          : "h-9 rounded-full border bg-card px-3 text-sm font-bold"
      }
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold">Wer ist das bei dir?</p>
      <div role="radiogroup" className="flex flex-wrap gap-1.5">
        {options.map((p) => chip(p.id, `${p.emoji} ${p.name}`))}
        {chip(NEW_ENTRY, "+ Neu")}
      </div>
    </div>
  );
}

export function PlayerLinks({ user }: { user: User }) {
  const { links, reload } = usePlayerLinks(user.id);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [inviting, setInviting] = useState<RosterPlayer | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Per invite: which roster entry is the inviter.
  const [choices, setChoices] = useState<Record<string, string>>({});

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
    return <Section title="Mitspieler" hint="Noch nicht eingerichtet." />;
  }
  if (links.state === "error") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Gerade nicht erreichbar.
      </p>
    );
  }

  const { profiles } = links;
  const own = profiles.get(user.id);
  const invites = openInvites(links.links, user.id);
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

  // Roster entries that could be the inviter: neither the user nor linked to anyone.
  const taken = linkedEntries(links.links, user.id, selfId);
  const candidates = roster.filter((p) => !taken.has(p.id));
  const whoIs = (invite: PlayerLink) => {
    const chosen = choices[invite.id];
    if (chosen !== undefined) return chosen;
    const name = profiles.get(invite.ownerId)?.name ?? "";
    return candidates.find((p) => sameName(p.name, name))?.id ?? NEW_ENTRY;
  };

  // Links back right away with the entry the user picked; the sync then
  // renames it and sends both histories.
  const accept = async (invite: PlayerLink) => {
    if (!(await acceptLink(supabase, invite.id))) return false;
    const name = profiles.get(invite.ownerId)?.name ?? invite.playerName;
    let playerId = whoIs(invite);
    if (playerId === NEW_ENTRY) {
      const entry = entryFor(roster, name, new Set(roster.map((p) => p.id)));
      saveRoster(entry.roster);
      setRoster(entry.roster);
      playerId = entry.playerId;
    }
    return linkBack(supabase, invite.id, playerId, name);
  };

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
      : `Eingeladen: ${handleFor(profiles, link.inviteeId)}`;

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
                <b>{handleFor(profiles, invite.ownerId)}</b> will dich als{" "}
                <b>„{invite.playerName}“</b> verknüpfen.
              </p>
              <WhoIsIt
                options={candidates}
                value={whoIs(invite)}
                onChange={(id) =>
                  setChoices((prev) => ({ ...prev, [invite.id]: id }))
                }
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === invite.id}
                  onClick={() => void act(invite.id, () => accept(invite))}
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
        title="Mitspieler"
        hint="Verknüpfte Spieler tragen ihren Kontonamen und bekommen eure Spiele."
      >
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Spieler.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {roster.map((player) => {
              const link = mine.get(player.id);
              const isSelf = player.id === selfId;
              return (
                <li key={player.id} className="flex flex-col gap-2 py-2">
                  <div className="flex items-center gap-3">
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
                    ) : inviting?.id === player.id ? null : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInviting(player)}
                      >
                        <Link2 /> Verknüpfen
                      </Button>
                    )}
                  </div>
                  {inviting?.id === player.id && !link && !isSelf && (
                    <InviteForm
                      player={player}
                      ownHandle={own ? handleOf(own) : null}
                      onClose={() => setInviting(null)}
                      onInvited={() => void reload()}
                      onMarkSelf={() => markSelf(player.id)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
