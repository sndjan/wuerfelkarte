"use client";

import {
  EllipsisVertical,
  Eye,
  EyeOff,
  Info,
  Palette,
  RotateCcw,
  Rows3,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * One row in the in-game menu. Either it runs an action (the menu closes
 * first), or it wraps the row in a dialog of the game's own.
 */
export type MenuAction = {
  icon: ReactNode;
  label: ReactNode;
  onSelect?: () => void;
  /** Receives the row to use as the dialog's trigger. */
  dialog?: (trigger: ReactNode) => ReactNode;
};

type GameMenuProps = {
  /** Game-specific rows, shown above the ones every game has. */
  actions?: MenuAction[];
  /** Rules text; omitted or empty hides the "Regeln anzeigen" entry. */
  gamemodeInfo?: string[];
  hideScores?: { value: boolean; onToggle: () => void };
  /** Denser player cards so a full sheet fits on screen without scrolling. */
  compactMode?: { value: boolean; onToggle: () => void };
  /** Clears the entered results but keeps the players — label varies per game. */
  resetRounds?: { label: string; onSelect: () => void };
  onResetAll?: () => void;
  /** Seasonal decoration toggle, offered only while a season is running. */
  seasonalTheme?: { active: boolean; onToggle: () => void };
};

/** The ⋮ menu on every game board. */
export function GameMenu({
  actions = [],
  gamemodeInfo,
  hideScores,
  compactMode,
  resetRounds,
  onResetAll,
  seasonalTheme,
}: GameMenuProps) {
  const [open, setOpen] = useState(false);

  const row = (icon: ReactNode, label: ReactNode) => (
    <div className="flex w-full items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full bg-white">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Optionen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onSelect={(event) => {
                // A dialog row must not let the menu swallow the click.
                event.preventDefault();
                if (action.onSelect) {
                  setOpen(false);
                  action.onSelect();
                }
              }}
            >
              {action.dialog
                ? action.dialog(row(action.icon, action.label))
                : row(action.icon, action.label)}
            </DropdownMenuItem>
          ))}

          {gamemodeInfo && gamemodeInfo.length > 0 && (
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Dialog>
                <DialogTrigger asChild>
                  {row(<Info />, "Regeln anzeigen")}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Infos zum Spielmodus</DialogTitle>
                  </DialogHeader>
                  <DialogDescription>{gamemodeInfo[0]}</DialogDescription>
                  <div className="grid grid-cols-1 gap-4">
                    {gamemodeInfo.slice(1).map((info, index) => (
                      <p key={index} className="text-sm">
                        {info}
                      </p>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </DropdownMenuItem>
          )}

          {hideScores && (
            <DropdownMenuItem onSelect={hideScores.onToggle}>
              {hideScores.value ? <Eye /> : <EyeOff />}
              <span>
                {hideScores.value
                  ? "Punktestand wieder anzeigen"
                  : "Punktestand während des Spiels verstecken"}
              </span>
            </DropdownMenuItem>
          )}

          {compactMode && (
            <DropdownMenuItem onSelect={compactMode.onToggle}>
              <Rows3 />
              <span>
                {compactMode.value
                  ? "Kompakte Ansicht deaktivieren"
                  : "Kompakte Ansicht aktivieren"}
              </span>
            </DropdownMenuItem>
          )}

          {resetRounds && (
            <DropdownMenuItem onSelect={resetRounds.onSelect}>
              <RotateCcw />
              <span>{resetRounds.label}</span>
            </DropdownMenuItem>
          )}

          {onResetAll && (
            <DropdownMenuItem onSelect={onResetAll}>
              <Trash2 />
              <span>Alles zurücksetzen</span>
            </DropdownMenuItem>
          )}

          {seasonalTheme && (
            <DropdownMenuItem onSelect={seasonalTheme.onToggle}>
              <Palette />
              <span>
                {seasonalTheme.active
                  ? "Design deaktivieren"
                  : "Design aktivieren"}
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
