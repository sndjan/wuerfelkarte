"use client";

import { Check, Loader2, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LobbySection } from "@/games/shared/components/LobbyShell";
import { gamemodes } from "@/games/yatzy/gamemodes";
import { callOnline, OnlineError } from "../client";
import { diceModeLabel, gameLabel } from "../config";
import { MAX_PLAYERS, type GameRow, type PlayerRow } from "../types";
import { ConfirmButton } from "./ConfirmButton";
import { CandidateList, useCandidates } from "./OnlineHome";

const errorText = (error: unknown) => (error instanceof OnlineError ? error.message : "Hat nicht geklappt.");

function InviteMore({ game, players }: { game: GameRow; players: PlayerRow[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const candidates = useCandidates(open);
  const room = MAX_PLAYERS - players.length;
  if (room <= 0) return null;
  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Weitere einladen
      </Button>
    );
  }
  const fresh = candidates?.filter((c) => !players.some((p) => p.user_id === c.userId)) ?? null;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <CandidateList
        candidates={fresh}
        selected={selected}
        limit={room}
        onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
      />
      <Button
        disabled={busy || selected.length === 0}
        onClick={async () => {
          setBusy(true);
          try {
            await callOnline({ type: "invite", gameId: game.id, userIds: selected });
            setSelected([]);
            setOpen(false);
          } catch (error) {
            toast.error(errorText(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        Einladen
      </Button>
    </Card>
  );
}

/** The game before it starts: who is in, who still has to answer. */
export function OnlineLobby({ game, players, userId }: { game: GameRow; players: PlayerRow[]; userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isHost = game.host_id === userId;
  const me = players.find((p) => p.user_id === userId);
  const accepted = players.filter((p) => p.status === "accepted");

  const run = async (action: Parameters<typeof callOnline>[0], after?: () => void) => {
    setBusy(true);
    try {
      await callOnline(action);
      after?.();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const config = gamemodes[game.gamemode];
  const settings = [
    diceModeLabel(game.dice_mode),
    ...(game.gamemode === "Chaoswunder"
      ? [
          game.settings.missionEveryRound ? "Mission jede Runde" : "Mission alle 2 Runden",
          ...(game.settings.balancedMode ? ["ausgewogen"] : []),
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-1 p-4">
        <p className="text-lg font-bold">{gameLabel(game)}</p>
        <p className="text-sm text-muted-foreground">{settings.join(" · ")}</p>
        {config?.description && <p className="text-sm">{config.description}</p>}
      </Card>

      {me?.status === "invited" && (
        <Card className="flex gap-2 p-4">
          <Button
            className="flex-1"
            disabled={busy}
            onClick={() => run({ type: "respond", gameId: game.id, accept: true })}
          >
            <Check /> Annehmen
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => run({ type: "respond", gameId: game.id, accept: false }, () => router.push("/online"))}
          >
            <X /> Ablehnen
          </Button>
        </Card>
      )}

      <LobbySection title={`Spieler (${accepted.length}/${players.length})`}>
        {players.map((p) => (
          <Card key={p.user_id} className="flex flex-row items-center justify-between gap-2 px-4 py-2">
            <span className="min-w-0 truncate font-semibold">
              {p.name}
              <span className="font-normal text-muted-foreground">#{p.tag}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {p.user_id === game.host_id ? (
                <Badge>Gastgeber</Badge>
              ) : p.status === "accepted" ? (
                <Badge className="bg-green-700">Dabei</Badge>
              ) : (
                <Badge variant="secondary">Eingeladen …</Badge>
              )}
              {isHost && p.user_id !== userId && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${p.name} ausladen`}
                  disabled={busy}
                  onClick={() => run({ type: "remove", gameId: game.id, userId: p.user_id })}
                >
                  <X />
                </Button>
              )}
            </span>
          </Card>
        ))}
        {isHost && <InviteMore game={game} players={players} />}
      </LobbySection>

      {isHost ? (
        <div className="flex flex-col gap-2">
          <Button
            className="h-12 text-base"
            disabled={busy || accepted.length < 2}
            onClick={() => run({ type: "start", gameId: game.id })}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Play />} Spiel starten
          </Button>
          {accepted.length < 2 && (
            <p className="text-center text-xs text-muted-foreground">Sobald jemand zusagt, kannst du starten.</p>
          )}
          {accepted.length >= 2 && accepted.length < players.length && (
            <p className="text-center text-xs text-muted-foreground">Offene Einladungen verfallen beim Start.</p>
          )}
          <ConfirmButton
            label="Spiel abbrechen"
            confirm="Wirklich abbrechen?"
            disabled={busy}
            onConfirm={() => run({ type: "cancel", gameId: game.id }, () => router.push("/online"))}
          />
        </div>
      ) : (
        me?.status === "accepted" && (
          <ConfirmButton
            label="Lobby verlassen"
            confirm="Wirklich verlassen?"
            disabled={busy}
            onConfirm={() => run({ type: "leave", gameId: game.id }, () => router.push("/online"))}
          />
        )
      )}
    </div>
  );
}
