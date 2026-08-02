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
import { suggestedRounds } from "./scoring";
import { WizardPlayer } from "./types";

type Step =
  | { type: "list" }
  | { type: "rename"; playerId: string; name: string; emoji: string }
  | { type: "newPlayer"; name: string; emoji: string }
  | { type: "confirmAdd"; name: string; emoji: string }
  | { type: "confirmRemove"; playerId: string; name: string };

interface ManagePlayersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: WizardPlayer[];
  totalRounds: number;
  onAddPlayer: (name: string, emoji: string, totalRounds: number) => void;
  onRemovePlayer: (playerId: string, totalRounds: number) => void;
  onRenamePlayer: (playerId: string, name: string, emoji: string) => void;
}

export function ManagePlayersDialog({
  open,
  onOpenChange,
  players,
  totalRounds,
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
  const freeEmoji = (extra?: string) =>
    EMOJI_OPTIONS.find(
      (o) => !players.some((p) => p.emoji === o) && o !== extra,
    ) ?? EMOJI_OPTIONS[0];

  const startRename = (player: WizardPlayer) =>
    setStep({
      type: "rename",
      playerId: player.id,
      name: player.name,
      emoji: player.emoji ?? freeEmoji(),
    });

  const startNewPlayer = () =>
    setStep({ type: "newPlayer", name: "", emoji: freeEmoji() });

  const saveRename = () => {
    if (step.type !== "rename") return;
    const trimmed = step.name.trim();
    if (!trimmed) return;
    const player = players.find((p) => p.id === step.playerId);
    if (player) updateRosterPlayerByName(player.name, trimmed, step.emoji);
    onRenamePlayer(step.playerId, trimmed, step.emoji);
    setStep({ type: "list" });
  };

  const confirmNewPlayer = () => {
    if (step.type !== "newPlayer") return;
    const trimmed = step.name.trim();
    if (!trimmed) return;
    setStep({ type: "confirmAdd", name: trimmed, emoji: step.emoji });
  };

  const pickRosterPlayer = (player: RosterPlayer) =>
    setStep({ type: "confirmAdd", name: player.name, emoji: player.emoji });

  const finishAdd = (nextTotalRounds: number) => {
    if (step.type !== "confirmAdd") return;
    const alreadySaved = roster.some(
      (p) => p.name.trim().toLowerCase() === step.name.trim().toLowerCase(),
    );
    if (alreadySaved) {
      activateRosterPlayerByName(step.name);
    } else {
      addRosterPlayer(step.name, step.emoji);
    }
    onAddPlayer(step.name, step.emoji, nextTotalRounds);
    onOpenChange(false);
  };

  const finishRemove = (nextTotalRounds: number) => {
    if (step.type !== "confirmRemove") return;
    onRemovePlayer(step.playerId, nextTotalRounds);
    onOpenChange(false);
  };

  const suggestedForAdd = suggestedRounds(players.length + 1);
  const suggestedForRemove = suggestedRounds(Math.max(players.length - 1, 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {step.type === "list" && (
          <>
            <DialogHeader>
              <DialogTitle>Spieler verwalten</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
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
              <div className="flex flex-wrap items-center gap-2">
                {switchable.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => pickRosterPlayer(player)}
                    className="flex select-none items-center gap-2 rounded-full bg-card border px-4 py-2 text-foreground"
                  >
                    <span className="text-lg">{player.emoji}</span>
                    <span className="font-semibold">{player.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={startNewPlayer}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground"
                  aria-label="Neuen Spieler anlegen"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {step.type === "rename" && (
          <>
            <DialogHeader>
              <DialogTitle>Spieler bearbeiten</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Name eingeben..."
              value={step.name}
              onChange={(e) =>
                setStep({ ...step, name: e.target.value })
              }
              onKeyDown={(e) => e.key === "Enter" && saveRename()}
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
                onClick={saveRename}
                disabled={!step.name.trim()}
              >
                Speichern
              </Button>
            </DialogFooter>
          </>
        )}

        {step.type === "newPlayer" && (
          <>
            <DialogHeader>
              <DialogTitle>Neuer Spieler</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Name eingeben..."
              value={step.name}
              onChange={(e) => setStep({ ...step, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && confirmNewPlayer()}
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
                onClick={confirmNewPlayer}
                disabled={!step.name.trim()}
              >
                Weiter
              </Button>
            </DialogFooter>
          </>
        )}

        {step.type === "confirmAdd" && (
          <>
            <DialogHeader>
              <DialogTitle>Rundenanzahl neu berechnen?</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              {step.name} kommt mit 0 Punkten und leeren Vorrunden dazu.
              Aktuell sind {totalRounds} Runden eingestellt, empfohlen für{" "}
              {players.length + 1} Spieler sind {suggestedForAdd} Runden.
            </DialogDescription>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                variant="outline"
                onClick={() => finishAdd(totalRounds)}
              >
                Beibehalten ({totalRounds} Runden)
              </Button>
              <Button type="button" onClick={() => finishAdd(suggestedForAdd)}>
                Neu berechnen ({suggestedForAdd} Runden)
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
              Die Punkte von {step.name} gehen verloren. Aktuell sind{" "}
              {totalRounds} Runden eingestellt, empfohlen für{" "}
              {Math.max(players.length - 1, 1)} Spieler sind{" "}
              {suggestedForRemove} Runden.
            </DialogDescription>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep({ type: "list" })}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => finishRemove(totalRounds)}
              >
                Beibehalten ({totalRounds} Runden)
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => finishRemove(suggestedForRemove)}
              >
                Entfernen & neu berechnen ({suggestedForRemove} Runden)
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
