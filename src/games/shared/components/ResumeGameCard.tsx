"use client";

import { ChevronRight, Trash2 } from "lucide-react";
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
      <div className="flex items-center rounded-2xl border-2 border-brand bg-surface">
        <Link
          href={game.href}
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5 text-ink no-underline"
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            {game.emoji}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-bold leading-6" style={{ fontFamily: "var(--font-baloo)" }}>
              {showGameName ? `${game.gameName} · ${game.modeName}` : game.modeName}
            </span>
            <span className="truncate text-sm text-muted-foreground">{game.progress}</span>
          </span>
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Weiterspielen"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </span>
        </Link>
        {canDiscard ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Spiel verwerfen"
            className="mx-1 rounded-full p-2.5 text-muted-foreground hover:bg-secondary hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        ) : (
          <span className="w-3.5" aria-hidden="true" />
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
