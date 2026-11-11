"use client";

import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AccountButton } from "@/components/account/AccountButton";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GamemodePills } from "@/games/shared/components/GamemodePills";
import { LobbySection } from "@/games/shared/components/LobbyShell";
import { gamemodes } from "@/games/yatzy/gamemodes";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { callOnline, OnlineError } from "../client";
import { ONLINE_EMOJI, diceModeLabel, gameLabel, hostName } from "../config";
import type { DiceMode } from "../engine";
import { useMyOnline, type GameWithPlayers } from "../hooks/useOnline";
import { MAX_PLAYERS, type Candidate } from "../types";
import { ActiveGameCard } from "./ActiveGameCard";
import { Switch } from "./Switch";

const errorText = (error: unknown) => (error instanceof OnlineError ? error.message : "Hat nicht geklappt.");

function InviteCard({ game, onDone }: { game: GameWithPlayers; onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const respond = async (accept: boolean) => {
    setBusy(true);
    try {
      await callOnline({ type: "respond", gameId: game.id, accept });
      if (accept) router.push(`/online/${game.id}`);
      else onDone();
    } catch (error) {
      toast.error(errorText(error));
      onDone();
    } finally {
      setBusy(false);
    }
  };
  const others = game.online_game_players.filter((p) => p.user_id !== game.host_id).map((p) => p.name);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div>
        <p className="font-bold">{hostName(game)} lädt dich ein</p>
        <p className="text-sm text-muted-foreground">
          {gameLabel(game)} · {diceModeLabel(game.dice_mode)}
          {others.length > 0 && ` · mit ${others.join(", ")}`}
        </p>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={busy} onClick={() => respond(true)}>
          <Check /> Annehmen
        </Button>
        <Button variant="outline" className="flex-1" disabled={busy} onClick={() => respond(false)}>
          <X /> Ablehnen
        </Button>
      </div>
    </Card>
  );
}

/** The linked accounts as a checklist; busy ones are shown but cannot be picked. */
export function CandidateList({
  candidates,
  selected,
  onToggle,
  limit,
}: {
  candidates: Candidate[] | null;
  selected: string[];
  onToggle: (userId: string) => void;
  limit: number;
}) {
  if (candidates === null) {
    return <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />;
  }
  if (candidates.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Noch keine verknüpften Mitspieler. Verknüpfe sie unter{" "}
        <Link href="/konto" className="font-semibold text-brand-accent underline">
          Konto
        </Link>{" "}
        mit ihrer Konto-ID.
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {candidates.map((c) => {
        const checked = selected.includes(c.userId);
        const disabled = c.busy || (!checked && selected.length >= limit);
        return (
          <button
            key={c.userId}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(c.userId)}
            className={cn(
              "flex items-center justify-between rounded-full border px-4 py-2 text-left transition-colors disabled:opacity-50",
              checked ? "border-brand-accent bg-brand-accent/10" : "border-border bg-card",
            )}
          >
            <span className="font-semibold">
              {c.name}
              <span className="font-normal text-muted-foreground">#{c.tag}</span>
            </span>
            {c.busy ? (
              <span className="text-xs text-muted-foreground">spielt gerade</span>
            ) : (
              checked && <Check className="size-4 text-brand-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function useCandidates(enabled: boolean) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    callOnline<{ candidates: Candidate[] }>({ type: "candidates" })
      .then((r) => !cancelled && setCandidates(r.candidates))
      .catch((error) => {
        if (cancelled) return;
        setCandidates([]);
        toast.error(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return candidates;
}

function NewGame() {
  const router = useRouter();
  const [gamemode, setGamemode] = useState<string>("Wunder");
  const [diceMode, setDiceMode] = useState<DiceMode>("digital");
  const [missionEveryRound, setMissionEveryRound] = useState(false);
  const [balancedMode, setBalancedMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const candidates = useCandidates(true);

  const create = async () => {
    setBusy(true);
    try {
      const { gameId } = await callOnline<{ gameId: string }>({
        type: "create",
        gamemode,
        diceMode,
        invitees: selected,
        missionEveryRound,
        balancedMode,
      });
      router.push(`/online/${gameId}`);
    } catch (error) {
      toast.error(errorText(error));
      setBusy(false);
    }
  };

  return (
    <>
      <LobbySection title="Modus">
        <GamemodePills gamemodes={gamemodes} value={gamemode} onChange={setGamemode} />
        {gamemodes[gamemode].description && (
          <p className="text-sm text-muted-foreground">{gamemodes[gamemode].description}</p>
        )}
      </LobbySection>
      <LobbySection title="Würfel">
        <div className="grid grid-cols-2 gap-2">
          {(["digital", "physical"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDiceMode(mode)}
              className={cn(
                "rounded-2xl border px-3 py-2 text-left",
                diceMode === mode ? "border-brand-accent bg-brand-accent/10" : "border-border bg-card",
              )}
            >
              <p className="font-semibold">{mode === "digital" ? "🎲 Digital" : "✋ Echte Würfel"}</p>
              <p className="text-xs text-muted-foreground">
                {mode === "digital" ? "Die App würfelt und rechnet." : "Jeder würfelt selbst und trägt ein."}
              </p>
            </button>
          ))}
        </div>
        {gamemode === "Chaoswunder" && (
          <Card className="flex flex-col gap-4 p-4">
            <Switch
              title="Mission jede Runde wechseln"
              hint="Aus: alle 2 Runden · Ein: jede Runde"
              checked={missionEveryRound}
              onToggle={() => setMissionEveryRound((v) => !v)}
            />
            <Switch
              title="Ausgewogener Modus"
              hint="Feste Mischung aus schweren, neutralen und guten Missionen"
              checked={balancedMode}
              onToggle={() => setBalancedMode((v) => !v)}
            />
            {diceMode === "digital" && (
              <p className="text-xs text-muted-foreground">Mit digitalen Würfeln achtet die App auf die Missionen.</p>
            )}
          </Card>
        )}
      </LobbySection>
      <LobbySection title={`Mitspieler einladen (${selected.length}/${MAX_PLAYERS - 1})`}>
        <CandidateList
          candidates={candidates}
          selected={selected}
          limit={MAX_PLAYERS - 1}
          onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
        />
      </LobbySection>
      <Button className="h-12 text-base" disabled={busy || selected.length === 0} onClick={create}>
        {busy ? <Loader2 className="animate-spin" /> : ONLINE_EMOJI} Einladen
      </Button>
    </>
  );
}

/** /online: invites, the game this account is in, or a new one. */
export function OnlineHome() {
  const { user } = useAuth();
  const online = useMyOnline();

  let body: React.ReactNode;
  if (online.state === "loading") {
    body = <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />;
  } else if (online.state === "unavailable") {
    body = <Card className="p-4 text-sm">Online-Spiele sind hier noch nicht eingerichtet.</Card>;
  } else if (online.state === "signed-out" || !user) {
    body = (
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm">
          Online spielt ihr jeder auf dem eigenen Handy. Dafür braucht jeder ein Konto, und ihr verknüpft euch über
          eure Konto-IDs.
        </p>
        <Button asChild>
          <Link href="/konto">Anmelden</Link>
        </Button>
      </Card>
    );
  } else if (online.state === "error") {
    body = (
      <Card className="flex flex-col gap-3 p-4 text-sm">
        Konnte die Online-Spiele nicht laden.
        <Button variant="outline" onClick={online.reload}>
          Nochmal
        </Button>
      </Card>
    );
  } else {
    body = (
      <>
        {online.active ? (
          <LobbySection title="Dein Spiel">
            <ActiveGameCard game={online.active} userId={user.id} />
          </LobbySection>
        ) : (
          online.invites.length > 0 && (
            <LobbySection title="Einladungen">
              {online.invites.map((game) => (
                <InviteCard key={game.id} game={game} onDone={online.reload} />
              ))}
            </LobbySection>
          )
        )}
        {!online.active && <NewGame />}
      </>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <PageHeader backHref="/" title="Kniffel Online" right={<AccountButton />} />
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-10">{body}</div>
    </div>
  );
}
