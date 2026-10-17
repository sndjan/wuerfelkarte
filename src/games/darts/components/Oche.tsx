"use client";

import { Grid3X3, Target, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** The way back out of a mis-tap, plus the switch between board and keypad. */
export function OcheControls({
  canUndo,
  onUndo,
  inputMode,
  onToggleInputMode,
}: {
  canUndo: boolean;
  onUndo: () => void;
  inputMode: "board" | "keypad";
  onToggleInputMode: () => void;
}) {
  const switchLabel =
    inputMode === "board"
      ? "Auf Tastenfeld umschalten"
      : "Auf Dartboard umschalten";

  return (
    // A row above the keypad on a phone, a column beside the board on a
    // wide screen — the board is what the vertical space belongs to.
    <div className="flex items-center justify-end gap-2 lg:flex-col lg:items-stretch lg:justify-start">
      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Undo2 size={16} />
        <span className="hidden sm:inline">Dart zurück</span>
      </Button>
      {/* Phones have no room for the board, so the switch is a wide-screen one. */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="hidden rounded-full lg:inline-flex lg:w-full"
        onClick={onToggleInputMode}
        title={switchLabel}
        aria-label={switchLabel}
      >
        {inputMode === "board" ? <Grid3X3 size={16} /> : <Target size={16} />}
      </Button>
    </div>
  );
}
