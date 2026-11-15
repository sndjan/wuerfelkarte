"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { loadRoster, saveRoster } from "@/games/shared/roster";
import { EMOJI_OPTIONS } from "@/games/shared/types";
import { useAuth } from "@/lib/auth";
import { setProfileEmoji } from "@/lib/links/api";
import { loadSelfPlayerId } from "@/lib/links/self";
import { getSupabase } from "@/lib/supabase";
import { syncNow } from "@/lib/sync/client";
import { SELF_CHANGED_EVENT, useSelfPlayer } from "./useSelfPlayer";

/**
 * Picks the account's character. It is stored on the own roster entry
 * („Das bin ich“) and on the account's profile, so every linked account shows
 * the player with it (src/lib/links/names.ts). Characters are not exclusive.
 */
export function CharacterPage() {
  const { user } = useAuth();
  const self = useSelfPlayer();
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (self && picked === null) setPicked(self.emoji);
  }, [self, picked]);
  const current = picked ?? self?.emoji ?? EMOJI_OPTIONS[0];

  const save = async () => {
    setSaving(true);
    setError(null);
    const selfId = loadSelfPlayerId();
    if (selfId) {
      saveRoster(loadRoster().map((p) => (p.id === selfId ? { ...p, emoji: current } : p)));
      window.dispatchEvent(new Event(SELF_CHANGED_EVENT));
    }
    const supabase = getSupabase();
    if (user && supabase) {
      const result = await setProfileEmoji(supabase, current);
      if ("error" in result) {
        setSaving(false);
        setError(result.error);
        return;
      }
      void syncNow();
    }
    setSaving(false);
    router.push("/konto");
  };

  return (
    <div className="wk min-h-full bg-background">
      <PageHeader backHref="/konto" title="Charakter" />
      <main className="mx-auto flex min-h-[calc(100dvh-80px)] max-w-md flex-col gap-5 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-4">
          <span className="wkx-avatar wkx-avatar-xl" aria-hidden="true">
            {current}
          </span>
          <div className="min-w-0">
            <p className="font-display truncate text-2xl leading-8 font-extrabold">{self?.name ?? "Du"}</p>
            <p className="wk-hint">So sehen dich auch deine Mitspieler, auf all ihren Geräten.</p>
          </div>
        </div>
        <section className="wk-section">
          <h2 className="wk-overline">Charakter</h2>
          <div className="wkx-emojis" role="group" aria-label="Charakter wählen">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="wkx-emoji"
                aria-pressed={emoji === current}
                aria-label={`Charakter ${emoji}`}
                onClick={() => setPicked(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          {!self && (
            <p className="wk-hint">
              Markiere im Profil unter Mitspieler, wer du bist, dann trägt auch dein Eintrag diesen Charakter.
            </p>
          )}
        </section>
        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        )}
        <Button type="button" size="lg" className="mt-auto w-full" disabled={saving} onClick={() => void save()}>
          {saving && <Loader2 className="animate-spin" />}
          Charakter speichern
        </Button>
      </main>
    </div>
  );
}
