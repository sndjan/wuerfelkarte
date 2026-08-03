"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EMOJI_OPTIONS, RosterPlayer } from "@/components/yatzy-lobby/types";
import {
  activateRosterPlayerByName,
  addRosterPlayer,
  loadRoster,
  updateRosterPlayerByName,
} from "@/components/hooks/playerRosterStorage";
import { MAX_PLAYERS } from "./scoring";
import { Flip7Player } from "./types";

type Step =
  | { type: "list" }
  | { type: "rename"; playerId: string; name: string; emoji: string }
  | { type: "newPlayer"; name: string; emoji: string }
  | { type: "confirmRemove"; playerId: string; name: string };

interface ManagePlayersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Flip7Player[];
  onAddPlayer: (name: string, emoji: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onRenamePlayer: (playerId: string, name: string, emoji: string) => void;
}

export function ManagePlayersDialog({
  open,
  onOpenChange,
  players,
  onAddPlayer,
  onRemovePlayer,
  onRenamePlayer,
}: ManagePlayersDialogProps) {
  const [step, setStep] = useState<Step>({ type: "list" });
  const [roster, setRoster] = useState<RosterPlayer[]>([]);

  useEffect(() => {
    if (open) {
      setStep({ type: "list" });
      setRoster(loadRoster());
    }
  }, [open]);

  const takenNames = new Set(players.map((p) => p.name.trim().toLowerCase()));
  const switchable = roster.filter(
    (p) => !takenNames.has(p.name.trim().toLowerCase()),
  );
  const full = players.length >= MAX_PLAYERS;

  const freeEmoji = (extra?: string) =>
    EMOJI_OPTIONS.find(
      (o) => !players.some((p) => p.emoji === o) && o !== extra,
    ) ?? EMOJI_OPTIONS[0];

  const startRename = (player: Flip7Player) =>
    setStep({
      type: "rename",
      playerId: player.id,
      name: player.name,
      emoji: player.emoji ?? freeEmoji(),
    });

  const saveRename = () => {
    if (step.type !== "rename") return;
    const trimmed = step.name.trim();
    if (!trimmed) return;
    const player = players.find((p) => p.id === step.playerId);
    if (player) updateRosterPlayerByName(player.name, trimmed, step.emoji);
    onRenamePlayer(step.playerId, trimmed, step.emoji);
    setStep({ type: "list" });
  };

  /** Joining mid-game: past rounds are marked as "not there yet", not as zeros. */
  const finishAdd = (name: string, emoji: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const alreadySaved = roster.some(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadySaved) {
      activateRosterPlayerByName(trimmed);
    } else {
      addRosterPlayer(trimmed, emoji);
    }
    onAddPlayer(trimmed, emoji);
    onOpenChange(false);
  };

  const finishRemove = () => {
    if (step.type !== "confirmRemove") return;
    onRemovePlayer(step.playerId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {step.type === "list" && (
          <>
            <DialogHeader>
              <DialogTitle>Spieler verwalten</DialogTitle>
            </DialogHeader>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2"
                >
                  <span className="font-semibold truncate">
                    {player.emoji ? `${player.emoji} ` : ""}
                    {player.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startRename(player)}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
                      aria-label="Umbenennen"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStep({
                          type: "confirmRemove",
                          playerId: player.id,
                          name: player.name,
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent text-destructive"
                      aria-label="Entfernen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Spieler hinzufügen
              </span>
              {full ? (
                <p className="text-sm text-muted-foreground">
                  Mehr als {MAX_PLAYERS} Personen passen nicht in eine Partie.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Wer jetzt dazukommt, startet bei 0 Punkten; die bereits
                    gespielten Runden bleiben für ihn leer.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {switchable.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => finishAdd(player.name, player.emoji)}
                        className="flex select-none items-center gap-2 rounded-full bg-card border px-4 py-2 text-foreground"
                      >
                        <span className="text-lg">{player.emoji}</span>
                        <span className="font-semibold">{player.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setStep({
                          type: "newPlayer",
                          name: "",
                          emoji: freeEmoji(),
                        })
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground"
                      aria-label="Neuen Spieler anlegen"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {(step.type === "rename" || step.type === "newPlayer") && (
          <>
            <DialogHeader>
              <DialogTitle>
                {step.type === "rename" ? "Spieler bearbeiten" : "Neuer Spieler"}
              </DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Name eingeben..."
              value={step.name}
              onChange={(e) => setStep({ ...step, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (step.type === "rename") saveRename();
                else finishAdd(step.name, step.emoji);
              }}
            />
            <div className="grid grid-cols-4 gap-2">
              {EMOJI_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStep({ ...step, emoji: option })}
                  className={
                    option === step.emoji
                      ? "flex h-12 items-center justify-center rounded-xl bg-primary text-2xl sm:h-14"
                      : "flex h-12 items-center justify-center rounded-xl bg-secondary text-2xl sm:h-14"
                  }
                >
                  {option}
                </button>
              ))}
            </div>
            <DialogFooter className="flex flex-row justify-between sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep({ type: "list" })}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={() =>
                  step.type === "rename"
                    ? saveRename()
                    : finishAdd(step.name, step.emoji)
                }
                disabled={!step.name.trim()}
              >
                {step.type === "rename" ? "Speichern" : "Hinzufügen"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step.type === "confirmRemove" && (
          <>
            <DialogHeader>
              <DialogTitle>{step.name} entfernen?</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Die Punkte von {step.name} gehen verloren.
            </DialogDescription>
            <DialogFooter className="flex flex-row justify-between sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep({ type: "list" })}
              >
                Abbrechen
              </Button>
              <Button type="button" variant="destructive" onClick={finishRemove}>
                Entfernen
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
