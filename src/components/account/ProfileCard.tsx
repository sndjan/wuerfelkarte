"use client";

import { Check, Copy, Loader2, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setProfileName } from "@/lib/links/api";
import { handleOf, type Profile } from "@/lib/links/share";
import { getSupabase } from "@/lib/supabase";
import { syncNow } from "@/lib/sync/client";

const BALOO = "font-[family-name:var(--font-baloo)]";

/** The account's name and ID ("Jan#4821"), which others use to link a player to it. */
export function ProfileCard({
  profile,
  suggestedName,
  onSaved,
}: {
  profile: Profile | undefined;
  suggestedName: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(!profile);
  const [name, setName] = useState(profile?.name ?? suggestedName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const save = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const result = await setProfileName(supabase, name);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setEditing(false);
    onSaved();
    // Linked rosters, and the own entry, pick up the new name.
    void syncNow();
  };

  const copy = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(handleOf(profile));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the ID is on screen anyway.
    }
  };

  if (editing) {
    return (
      <form
        className="flex flex-col gap-3 rounded-[20px] bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div>
          <h3 className={`${BALOO} text-lg font-extrabold`}>{profile ? "Name ändern" : "Wie heißt du?"}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Unter diesem Namen stehst du in den Spielen und Statistiken von allen, die dich verknüpfen.
          </p>
        </div>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={24}
          required
          placeholder="Dein Name"
          className="h-11 rounded-xl"
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving && <Loader2 className="animate-spin" />}
            Speichern
          </Button>
          {profile && (
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    );
  }

  return (
    <section className="flex items-center gap-3 rounded-[20px] bg-card p-5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Deine Konto-ID</p>
        <p className={`${BALOO} truncate text-2xl font-extrabold`}>
          {profile!.name}
          <span className="text-muted-foreground">#{profile!.tag}</span>
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-full"
        aria-label="Konto-ID kopieren"
        onClick={() => void copy()}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-full"
        aria-label="Name ändern"
        onClick={() => {
          setName(profile!.name);
          setEditing(true);
        }}
      >
        <Pencil />
      </Button>
    </section>
  );
}
