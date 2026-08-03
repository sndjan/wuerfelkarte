"use client";

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
import { Input } from "@/components/ui/input";
import { EMOJI_OPTIONS, RosterPlayer } from "../types";

interface PlayerEditMenuProps {
  player: RosterPlayer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => void;
  onChangeEmoji: (id: string, emoji: string) => void;
  onRemove: (id: string) => void;
}

export function PlayerEditMenu({
  player,
  open,
  onOpenChange,
  onRename,
  onChangeEmoji,
  onRemove,
}: PlayerEditMenuProps) {
  const [name, setName] = useState(player.name);
  const [emoji, setEmoji] = useState(player.emoji);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(player.name);
      setEmoji(player.emoji);
    }
    onOpenChange(next);
  };

  const handleSave = () => {
    if (name.trim()) {
      onRename(player.id, name.trim());
      onChangeEmoji(player.id, emoji);
    }
    onOpenChange(false);
  };

  const handleRemove = () => {
    onRemove(player.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Spieler bearbeiten</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Ändere Name oder Emoji, oder entferne den Spieler aus der Liste.
        </DialogDescription>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-4 gap-2">
          {EMOJI_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              className={
                option === emoji
                  ? "flex h-14 items-center justify-center rounded-xl bg-primary text-2xl"
                  : "flex h-14 items-center justify-center rounded-xl bg-secondary text-2xl"
              }
            >
              {option}
            </button>
          ))}
        </div>
        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <Button type="button" variant="destructive" onClick={handleRemove}>
            Entfernen
          </Button>
          <Button type="button" onClick={handleSave} disabled={!name.trim()}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
