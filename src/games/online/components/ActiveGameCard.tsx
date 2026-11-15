"use client";

import { Emoji } from "@/components/emoji/Emoji";
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
    <Link href={`/online/${game.id}`} className={cn("wk-listrow", mine && "wk-card-accent")}>
      <span className="wk-listrow-emoji" aria-hidden="true">
        <Emoji e={ONLINE_EMOJI} />
      </span>
      <div className="wk-listrow-body">
        <p className="wk-listrow-title">
          {gameLabel(game)} · {diceModeLabel(game.dice_mode)}
        </p>
        <p className={mine ? "wk-listrow-meta" : "wk-listrow-sub"}>{text}</p>
      </div>
      <span className={cn("wk-btn wk-btn-sm", mine ? "wk-btn-primary" : "wk-btn-outline")}>Öffnen</span>
    </Link>
  );
}
