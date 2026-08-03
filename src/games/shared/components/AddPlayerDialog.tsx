"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { EMOJI_OPTIONS } from "../types";

interface AddPlayerDialogProps {
  onAdd: (name: string, emoji: string) => void;
}

export function AddPlayerDialog({ onAdd }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), emoji);
    setName("");
    setEmoji(EMOJI_OPTIONS[0]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xl font-bold text-accent-foreground"
          aria-label="Spieler hinzufügen"
        >
          +
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Neuer Spieler</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Name eingeben..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
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
        <DialogFooter>
          <Button type="button" onClick={handleAdd} disabled={!name.trim()}>
            Hinzufügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
