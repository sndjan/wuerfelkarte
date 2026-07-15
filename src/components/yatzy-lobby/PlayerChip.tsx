"use client";

import { useRef, useState } from "react";
import { PlayerEditMenu } from "./PlayerEditMenu";
import { RosterPlayer } from "./types";

const LONG_PRESS_MS = 500;

interface PlayerChipProps {
  player: RosterPlayer;
  selectionNumber?: number;
  onToggleActive: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onChangeEmoji: (id: string, emoji: string) => void;
  onRemove: (id: string) => void;
}

export function PlayerChip({
  player,
  selectionNumber,
  onToggleActive,
  onRename,
  onChangeEmoji,
  onRemove,
}: PlayerChipProps) {
  const [editOpen, setEditOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const startPress = () => {
    longPressFiredRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setEditOpen(true);
    }, LONG_PRESS_MS);
  };

  const clearPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = () => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    onToggleActive(player.id);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={startPress}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        className={
          player.active
            ? "relative flex select-none items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground"
            : "relative flex select-none items-center gap-2 rounded-full bg-card px-4 py-2 text-foreground"
        }
      >
        <span className="text-lg">{player.emoji}</span>
        <span className="font-semibold">{player.name}</span>
        {player.active && selectionNumber != null && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-green-800 text-xs font-bold text-white">
            {selectionNumber}
          </span>
        )}
      </button>
      <PlayerEditMenu
        player={player}
        open={editOpen}
        onOpenChange={setEditOpen}
        onRename={onRename}
        onChangeEmoji={onChangeEmoji}
        onRemove={onRemove}
      />
    </>
  );
}
