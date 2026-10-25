"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RunningGame } from "../resume";

type ResumeGameCardProps = {
  game: RunningGame;
  /** The home page lists several games, so it names the game in the title. */
  showGameName?: boolean;
  /** Small print under the card, e.g. that starting anew replaces this game. */
  hint?: string;
  /** Throws the game away after the player confirmed it. */
  onDiscard?: (game: RunningGame) => void;
};

/** "Weiterspielen" — the way back into a game the browser lost track of. */
export function ResumeGameCard({
  game,
  showGameName,
  hint,
  onDiscard,
}: ResumeGameCardProps) {
  const [confirming, setConfirming] = useState(false);
  const canDiscard = onDiscard && game.discard;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Link
          href={game.href}
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-brand-accent bg-card p-4"
        >
          <span className="text-3xl">{game.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className={canDiscard ? "truncate pr-6 font-bold" : "truncate font-bold"}>
              {showGameName ? `${game.gameName} · ${game.modeName}` : game.modeName}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {game.players
                .map((p) => (p.emoji ? `${p.emoji} ${p.name}` : p.name))
                .join(", ")}
            </p>
            <p className="text-sm font-semibold text-brand-accent">{game.progress}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Weiterspielen
            <ArrowRight className="size-4" />
          </span>
        </Link>
        {canDiscard && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Spiel verwerfen"
            className="absolute top-2 right-2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {hint && <p className="px-1 text-xs text-muted-foreground">{hint}</p>}

      {canDiscard && (
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Spiel verwerfen?</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              {game.gameName} · {game.modeName} ({game.progress}) wird gelöscht
              und kann nicht mehr fortgesetzt werden.
            </DialogDescription>
            <DialogFooter className="flex flex-row justify-between sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setConfirming(false);
                  onDiscard?.(game);
                }}
              >
                Verwerfen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
