"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readJSON, writeJSON } from "@/games/shared/storage";
import { isGuest, useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { callOnline, OnlineError, peekLink } from "../client";
import { ONLINE_EMOJI, diceModeLabel, gameLabel } from "../config";
import type { LinkPreview } from "../types";

/** The name a guest typed last, so the next invite link is one tap. */
const GUEST_NAME_KEY = "online:guestName";

type Peeked = { state: "loading" } | { state: "gone" } | { state: "error"; message: string } | { state: "ready"; game: LinkPreview };

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background">
      <PageHeader backHref="/" title="Kniffel Online" />
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-10">{children}</div>
    </div>
  );
}

/** The account's own name, when it has picked one; null for guests and new accounts. */
function useOwnName(userId: string | null, guest: boolean) {
  const [name, setName] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId || guest) {
      setName(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => !cancelled && setName((data as { name: string } | null)?.name ?? null));
    return () => {
      cancelled = true;
    };
  }, [userId, guest]);
  return name;
}

/**
 * /online/beitreten/[code]: an invite link. Shows whose game it is and lets
 * anyone join the lobby — with their account, or as a guest with just a name
 * (signed in anonymously behind the scenes).
 */
export function JoinGame({ code }: { code: string }) {
  const router = useRouter();
  const { user, loading, available } = useAuth();
  const guest = isGuest(user);
  const ownName = useOwnName(user?.id ?? null, guest);
  const [peeked, setPeeked] = useState<Peeked>({ state: "loading" });
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(readJSON<string>(GUEST_NAME_KEY, ""));
    peekLink(code)
      .then((game) => setPeeked(game ? { state: "ready", game } : { state: "gone" }))
      .catch((e) => setPeeked({ state: "error", message: e instanceof OnlineError ? e.message : "Hat nicht geklappt." }));
  }, [code]);

  if (!available) {
    return (
      <Frame>
        <Card className="p-4 text-sm">Online-Spiele sind hier noch nicht eingerichtet.</Card>
      </Frame>
    );
  }
  if (peeked.state === "loading" || loading || ownName === undefined) {
    return (
      <Frame>
        <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
      </Frame>
    );
  }
  if (peeked.state !== "ready") {
    return (
      <Frame>
        <Card className="flex flex-col gap-3 p-4 text-sm">
          {peeked.state === "gone" ? "Diese Einladung gibt es nicht (mehr)." : peeked.message}
          <Button asChild variant="outline">
            <Link href="/">Zur Würfelkarte</Link>
          </Button>
        </Card>
      </Frame>
    );
  }

  const { game } = peeked;
  const needsName = !ownName;

  const join = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setJoining(true);
    setError(null);
    try {
      if (needsName) writeJSON(GUEST_NAME_KEY, name.trim());
      if (!user) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          throw new OnlineError(
            signInError.message.toLowerCase().includes("anonymous")
              ? "Mitspielen ohne Konto ist hier noch nicht eingerichtet."
              : "Hat nicht geklappt.",
          );
        }
      }
      const { gameId } = await callOnline<{ gameId: string }>({
        type: "join",
        code,
        ...(needsName ? { name: name.trim() } : {}),
      });
      router.replace(`/online/${gameId}`);
    } catch (e) {
      setError(e instanceof OnlineError ? e.message : "Hat nicht geklappt.");
      setJoining(false);
    }
  };

  return (
    <Frame>
      <Card className="flex flex-col gap-1 p-4">
        <p className="text-lg font-bold">
          {ONLINE_EMOJI} {game.host} lädt dich ein
        </p>
        <p className="text-sm text-muted-foreground">
          {gameLabel(game)} · {diceModeLabel(game.diceMode)}
        </p>
        <p className="text-sm text-muted-foreground">Dabei: {game.players.join(", ")}</p>
      </Card>

      {!game.open ? (
        <Card className="flex flex-col gap-3 p-4 text-sm">
          Das Spiel hat schon angefangen oder ist voll.
          <Button asChild variant="outline">
            <Link href="/">Zur Würfelkarte</Link>
          </Button>
        </Card>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void join();
          }}
        >
          {needsName ? (
            <Card className="flex flex-col gap-2 p-4">
              <label htmlFor="guest-name" className="text-sm font-bold">
                Dein Name
              </label>
              <Input
                id="guest-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={24}
                required
                autoFocus
                autoComplete="nickname"
                placeholder="So sehen dich die anderen"
                className="h-11 rounded-xl text-base"
              />
              {!user && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Kein Konto nötig. Mit einem{" "}
                  <Link href="/konto" className="font-semibold underline">
                    Konto
                  </Link>{" "}
                  landen deine Spiele auch auf deinen anderen Geräten.
                </p>
              )}
            </Card>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Du spielst als <b>{ownName}</b>.
            </p>
          )}
          {error && (
            <p role="alert" className="text-center text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="h-12 text-base" disabled={joining || (needsName && !name.trim())}>
            {joining && <Loader2 className="animate-spin" />}
            Mitspielen
          </Button>
        </form>
      )}
    </Frame>
  );
}
