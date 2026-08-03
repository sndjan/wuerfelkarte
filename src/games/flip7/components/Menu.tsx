"use client";

import { Target, Users } from "lucide-react";
import { useState } from "react";

import { GameMenu } from "@/games/shared/components/GameMenu";
import { ManagePlayersDialog } from "@/games/shared/components/ManagePlayersDialog";
import { MAX_PLAYERS, minTargetScore } from "../scoring";
import { Flip7Game } from "../types";
import { TargetScoreDialog } from "./TargetScoreDialog";

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
                // Lowering the goal below what someone already scored would end
                // the partie retroactively, so the stepper stops at the leader.
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
