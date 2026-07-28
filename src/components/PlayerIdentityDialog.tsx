"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

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
import {
  activateRosterPlayerByName,
  addRosterPlayer,
  loadRoster,
  updateRosterPlayerByName,
} from "@/components/hooks/playerRosterStorage";
import { EMOJI_OPTIONS, RosterPlayer } from "@/components/yatzy-lobby/types";

/**
 * `edit` retargets an existing card (its points stay), `add` puts another
 * player into the running game. Both share the roster picker and the
 * new-player form, so the two entry points look and behave the same.
 */
type Variant = "edit" | "add";
type Mode = "edit" | "new" | "pick";

interface PlayerIdentityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: Variant;
  playerName?: string;
  playerEmoji?: string;
  /** Names already in the running game — those players can't be picked. */
  takenNames?: string[];
  /** Applies the chosen identity: retargets the card, or adds the player. */
  onApply: (name: string, emoji?: string) => void;
}

export function PlayerIdentityDialog({
  open,
  onOpenChange,
  variant = "edit",
  playerName = "",
  playerEmoji,
  takenNames = [],
  onApply,
}: PlayerIdentityDialogProps) {
  const [mode, setMode] = useState<Mode>(variant === "add" ? "pick" : "edit");
  const [name, setName] = useState(playerName);
  const [emoji, setEmoji] = useState<string | undefined>(playerEmoji);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);

  const key = (value: string) => value.trim().toLowerCase();
  // Joined so the effect below doesn't re-run on every parent render.
  const takenKey = takenNames.map(key).join("|");

  const notInGame = (players: RosterPlayer[]) => {
    const taken = new Set(takenKey ? takenKey.split("|") : []);
    return players.filter((p) => !taken.has(key(p.name)));
  };

  const switchable = notInGame(roster);

  const freeEmoji = (players: RosterPlayer[]) =>
    EMOJI_OPTIONS.find((o) => !players.some((p) => p.emoji === o)) ??
    EMOJI_OPTIONS[0];

  // Read the roster on every open instead of holding it in state: the lobby
  // and the other cards' dialogs write to the same storage key.
  useEffect(() => {
    if (!open) return;
    const stored = loadRoster();
    setRoster(stored);
    if (variant === "add") {
      setMode(notInGame(stored).length > 0 ? "pick" : "new");
      setName("");
      setEmoji(freeEmoji(stored));
    } else {
      setMode("edit");
      setName(playerName);
      setEmoji(playerEmoji);
    }
    // The helpers above are recreated every render; the values they read
    // (`takenKey`) are what the effect actually depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variant, playerName, playerEmoji, takenKey]);

  const apply = (nextName: string, nextEmoji?: string) => {
    onApply(nextName, nextEmoji);
    onOpenChange(false);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (mode === "new") {
      const nextEmoji = emoji ?? EMOJI_OPTIONS[0];
      addRosterPlayer(trimmed, nextEmoji);
      apply(trimmed, nextEmoji);
    } else {
      updateRosterPlayerByName(playerName, trimmed, emoji);
      apply(trimmed, emoji);
    }
  };

  const startNewPlayer = () => {
    setMode("new");
    setName("");
    setEmoji(variant === "add" ? freeEmoji(roster) : EMOJI_OPTIONS[0]);
  };

  const cancelNewPlayer = () => {
    if (variant === "add") {
      // Nothing to fall back to when the roster is exhausted.
      if (switchable.length === 0) {
        onOpenChange(false);
        return;
      }
      setMode("pick");
      setName("");
      return;
    }
    setMode("edit");
    setName(playerName);
    setEmoji(playerEmoji);
  };

  const title =
    mode === "new"
      ? "Neuer Spieler"
      : variant === "add"
        ? "Spieler hinzufügen"
        : "Spieler bearbeiten";

  const description =
    mode === "new"
      ? variant === "add"
        ? "Der neue Spieler kommt ins laufende Spiel und wird gespeichert."
        : "Der neue Spieler übernimmt diese Karte samt eingetragener Punkte."
      : variant === "add"
        ? "Wähle einen gespeicherten Spieler oder lege einen neuen an."
        : "Ändere Name oder Emoji, oder wechsle die Karte zu einem anderen Spieler.";

  const showForm = mode !== "pick";
  const showRoster = mode !== "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription>{description}</DialogDescription>

        {showForm && (
          <>
            <Input
              autoFocus
              placeholder="Name eingeben..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />

            <div className="grid grid-cols-4 gap-2">
              {EMOJI_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setEmoji(option)}
                  className={
                    option === emoji
                      ? "flex h-12 items-center justify-center rounded-xl bg-primary text-2xl sm:h-14"
                      : "flex h-12 items-center justify-center rounded-xl bg-secondary text-2xl sm:h-14"
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {showRoster && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {variant === "add" ? "Gespeicherte Spieler" : "Anderer Spieler"}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {switchable.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    if (variant === "add") {
                      activateRosterPlayerByName(player.name);
                    }
                    apply(player.name, player.emoji);
                  }}
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
            {switchable.length === 0 && (
              <span className="text-sm text-muted-foreground">
                Alle gespeicherten Spieler sind schon im Spiel.
              </span>
            )}
          </div>
        )}

        {showForm && (
          <DialogFooter className="flex flex-row justify-between sm:justify-between">
            {mode === "new" ? (
              <Button type="button" variant="secondary" onClick={cancelNewPlayer}>
                Abbrechen
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" onClick={handleSave} disabled={!name.trim()}>
              {mode === "new" ? "Hinzufügen" : "Speichern"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
