"use client";

import { Check, Copy, Loader2, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMOJI_OPTIONS } from "@/games/shared/types";
import { setProfileEmoji, setProfileName } from "@/lib/links/api";
import { handleOf, type Profile } from "@/lib/links/share";
import { getSupabase } from "@/lib/supabase";
import { syncNow } from "@/lib/sync/client";

const BALOO = "font-[family-name:var(--font-baloo)]";

/**
 * The account's name and ID ("Jan#4821"), which others use to link a player
 * to it, and its emoji, which everyone linked to it sees.
 */
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
  const [picking, setPicking] = useState(false);
  const [emoji, setEmoji] = useState(profile?.emoji ?? null);

  const pickEmoji = async (option: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const before = emoji;
    setEmoji(option);
    setPicking(false);
    setError(null);
    const result = await setProfileEmoji(supabase, option);
    if ("error" in result) {
      setEmoji(before);
      setError(result.error);
      return;
    }
    onSaved();
    // Linked rosters, and the own entry, pick up the new emoji.
    void syncNow();
  };

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
          <h3 className={`${BALOO} text-lg font-extrabold`}>
            {profile ? "Name ändern" : "Dein Name"}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            So heißt du bei allen, die dich verknüpfen.
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-card p-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Emoji wählen"
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
          className={
            emoji
              ? "flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-2xl"
              : "flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-xs font-bold text-muted-foreground"
          }
        >
          {emoji ?? "Emoji"}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Konto-ID
          </p>
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
      </div>
      {picking && (
        <div className="flex flex-col gap-2">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Dein Emoji – alle, die mit dir verknüpft sind, sehen dich damit.
          </p>
          <div role="radiogroup" className="grid grid-cols-4 gap-2">
            {EMOJI_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={option === emoji}
                onClick={() => void pickEmoji(option)}
                className={
                  option === emoji
                    ? "flex h-12 items-center justify-center rounded-xl bg-primary text-2xl"
                    : "flex h-12 items-center justify-center rounded-xl bg-secondary text-2xl"
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
