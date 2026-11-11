"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { ONLINE_EMOJI, diceModeLabel, gameLabel } from "../config";
import type { GameWithPlayers } from "../hooks/useOnline";

/** Whose move the game waits for, from this account's point of view. */
export function waitingFor(game: GameWithPlayers, userId: string): { mine: boolean; text: string } {
  if (game.status === "lobby") {
    const open = game.online_game_players.filter((p) => p.status === "invited").length;
    if (game.host_id === userId) {
      return { mine: false, text: open > 0 ? `Lobby · ${open} Einladung${open === 1 ? "" : "en"} offen` : "Lobby · bereit zum Start" };
    }
    return { mine: false, text: "Lobby · wartet auf den Start" };
  }
  const state = game.state;
  const seat = state?.seats[state.current];
  if (!seat) return { mine: false, text: "" };
  return seat.userId === userId ? { mine: true, text: "Du bist dran!" } : { mine: false, text: `${seat.name} ist dran` };
}

/** The game this account is in, as a card that opens it. */
export function ActiveGameCard({ game, userId }: { game: GameWithPlayers; userId: string }) {
  const { mine, text } = waitingFor(game, userId);
  return (
    <Link
      href={`/online/${game.id}`}
      className={cn(
        "flex items-center justify-between gap-3 rounded-[20px] border-2 p-4",
        mine ? "border-brand-accent bg-brand-accent/10" : "border-border bg-card",
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-bold">
          {ONLINE_EMOJI} {gameLabel(game)} · {diceModeLabel(game.dice_mode)}
        </p>
        <p className={cn("text-sm", mine ? "font-semibold text-brand-accent" : "text-muted-foreground")}>{text}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold">Öffnen →</span>
    </Link>
  );
}
