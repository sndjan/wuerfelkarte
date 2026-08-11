"use client";

import { Target, Users } from "lucide-react";
import { useState } from "react";

import type { Theme } from "@/components/common/seasonal/useSeasonalTheme";
import { GameMenu } from "@/games/shared/components/GameMenu";
import { ManagePlayersDialog } from "@/games/shared/components/ManagePlayersDialog";
import { MAX_PLAYERS, minTargetScore } from "../scoring";
import { CaboGame } from "../types";
import { TargetScoreDialog } from "./TargetScoreDialog";

interface MenuProps {
  game: CaboGame;
  gamemodeInfo: string[];
  onAddPlayer: (name: string, emoji: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onRenamePlayer: (playerId: string, name: string, emoji: string) => void;
  onSetTargetScore: (value: number) => void;
  onResetRounds: () => void;
  onResetAll: () => void;
  hideScores: boolean;
  onToggleHideScores: () => void;
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
  onSetTargetScore,
  onResetRounds,
  onResetAll,
  hideScores,
  onToggleHideScores,
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
            icon: <Target />,
            label: "Zielpunktzahl anpassen",
            dialog: (trigger) => (
              <TargetScoreDialog
                targetScore={game.targetScore}
                // Lowering the goal below what someone already has would end
                // the partie retroactively, so the stepper stops there.
                minTarget={minTargetScore(game)}
                onSetTargetScore={onSetTargetScore}
              >
                {trigger}
              </TargetScoreDialog>
            ),
          },
        ]}
        gamemodeInfo={gamemodeInfo}
        hideScores={{ value: hideScores, onToggle: onToggleHideScores }}
        resetRounds={{ label: "Runden zurücksetzen", onSelect: onResetRounds }}
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
        joinHint="Wer jetzt dazukommt, startet bei 0 Punkten; die bereits gespielten Runden bleiben für ihn leer."
        onAddPlayer={onAddPlayer}
        onRemovePlayer={onRemovePlayer}
        onRenamePlayer={onRenamePlayer}
      />
    </>
  );
}
