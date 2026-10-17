"use client";

import { ListOrdered, Users } from "lucide-react";
import { useState } from "react";

import type { Theme } from "@/components/common/seasonal/useSeasonalTheme";
import { GameMenu } from "@/games/shared/components/GameMenu";
import { ManagePlayersDialog } from "@/games/shared/components/ManagePlayersDialog";
import { MAX_PLAYERS, minLegsToWin } from "../scoring";
import { DartsGame } from "../types";
import { LegsDialog } from "./LegsDialog";

interface MenuProps {
  game: DartsGame;
  gamemodeInfo: string[];
  onAddPlayer: (name: string, emoji: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onRenamePlayer: (playerId: string, name: string, emoji: string) => void;
  onSetLegsToWin: (value: number) => void;
  onResetLegs: () => void;
  onResetAll: () => void;
  seasonalTheme: Theme;
  isThemeActive?: boolean;
  onToggleTheme: () => void;
}

export function Menu({
  game,
  gamemodeInfo,
  onAddPlayer,
  onRemovePlayer,
  onRenamePlayer,
  onSetLegsToWin,
  onResetLegs,
  onResetAll,
  seasonalTheme,
  isThemeActive,
  onToggleTheme,
}: MenuProps) {
  const [managePlayersOpen, setManagePlayersOpen] = useState(false);

  return (
    <>
      <GameMenu
        actions={[
          {
            icon: <Users />,
            label: "Spieler verwalten",
            onSelect: () => setManagePlayersOpen(true),
          },
          {
            icon: <ListOrdered />,
            label: "Legs anpassen",
            dialog: (trigger) => (
              <LegsDialog
                legsToWin={game.legsToWin}
                // Lowering the target below a tally already won would decide
                // the match retroactively, so the stepper stops at the leader.
                minLegs={minLegsToWin(game)}
                onSetLegsToWin={onSetLegsToWin}
              >
                {trigger}
              </LegsDialog>
            ),
          },
        ]}
        gamemodeInfo={gamemodeInfo}
        resetRounds={{ label: "Legs zurücksetzen", onSelect: onResetLegs }}
        onResetAll={onResetAll}
        seasonalTheme={
          seasonalTheme === "none"
            ? undefined
            : { active: isThemeActive ?? false, onToggle: onToggleTheme }
        }
      />

      <ManagePlayersDialog
        open={managePlayersOpen}
        onOpenChange={setManagePlayersOpen}
        players={game.players}
        maxPlayers={MAX_PLAYERS}
        joinHint={`Wer jetzt dazukommt, startet im laufenden Leg auf ${game.startScore} und wirft ab der nächsten Runde mit.`}
        onAddPlayer={onAddPlayer}
        onRemovePlayer={onRemovePlayer}
        onRenamePlayer={onRenamePlayer}
      />
    </>
  );
}
