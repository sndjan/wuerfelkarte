"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EllipsisVertical,
  Eye,
  EyeOff,
  Info,
  Moon,
  RotateCcw,
  Sun,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { ManagePlayersDialog } from "./ManagePlayersDialog";
import { TargetScoreDialog } from "./TargetScoreDialog";
import { minTargetScore } from "../scoring";
import { Flip7Game } from "../types";

interface MenuProps {
  game: Flip7Game;
  gamemodeInfo: string[];
  onAddPlayer: (name: string, emoji: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onRenamePlayer: (playerId: string, name: string, emoji: string) => void;
  onSetTargetScore: (value: number) => void;
  onResetRounds: () => void;
  onResetAll: () => void;
  hideScores: boolean;
  onToggleHideScores: () => void;
}

export function Menu({
  game,
  gamemodeInfo,
  onAddPlayer,
  onRemovePlayer,
  onRenamePlayer,
  onSetTargetScore,
  onResetRounds,
  onResetAll,
  hideScores,
  onToggleHideScores,
}: MenuProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [managePlayersOpen, setManagePlayersOpen] = useState(false);

  // Lowering the goal below what someone already scored would end the partie
  // retroactively, so the stepper stops at the current leader.
  const minTarget = minTargetScore(game);

  return (
    <>
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
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setOpen(false);
                setManagePlayersOpen(true);
              }}
            >
              <Users />
              <span>Spieler verwalten</span>
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <TargetScoreDialog
                targetScore={game.targetScore}
                minTarget={minTarget}
                onSetTargetScore={onSetTargetScore}
              >
                <div className="flex items-center gap-2 w-full">
                  <Target />
                  <span>Zielpunktzahl anpassen</span>
                </div>
              </TargetScoreDialog>
            </DropdownMenuItem>

            {gamemodeInfo.length > 0 && (
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="flex items-center gap-2 w-full">
                      <Info />
                      <span>Regeln anzeigen</span>
                    </div>
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

            <DropdownMenuItem onSelect={onToggleHideScores}>
              {hideScores ? <Eye /> : <EyeOff />}
              <span>
                {hideScores
                  ? "Punktestand wieder anzeigen"
                  : "Punktestand während des Spiels verstecken"}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={onResetRounds}>
              <RotateCcw />
              <span>Runden zurücksetzen</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onResetAll}>
              <Trash2 />
              <span>Alles zurücksetzen</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-[1.2rem] w-[1.2rem] transition-all scale-100" />
                  <span>Dunkler Modus</span>
                </>
              ) : (
                <>
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
                  <span>Heller Modus</span>
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ManagePlayersDialog
        open={managePlayersOpen}
        onOpenChange={setManagePlayersOpen}
        players={game.players}
        onAddPlayer={onAddPlayer}
        onRemovePlayer={onRemovePlayer}
        onRenamePlayer={onRenamePlayer}
      />
    </>
  );
}
