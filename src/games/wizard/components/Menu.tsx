"use client";

import { Hash, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameMenu } from "@/games/shared/components/GameMenu";
import { ManagePlayersDialog } from "@/games/shared/components/ManagePlayersDialog";
import { MAX_PLAYERS, deckSize, suggestedRounds } from "../scoring";
import { WizardGame } from "../types";
import { RoundsDialog } from "./RoundsDialog";

interface MenuProps {
  game: WizardGame;
  gamemodeInfo: string[];
  onAddPlayer: (name: string, emoji: string, totalRounds: number) => void;
  onRemovePlayer: (playerId: string, totalRounds: number) => void;
  onRenamePlayer: (playerId: string, name: string, emoji: string) => void;
  onSetRoundCount: (next: number) => void;
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
  onSetRoundCount,
  onResetRounds,
  onResetAll,
  hideScores,
  onToggleHideScores,
}: MenuProps) {
  const [managePlayersOpen, setManagePlayersOpen] = useState(false);

  const cards = deckSize(game.specialCards);
  const totalRounds = game.totalRounds;
  // A bigger or smaller table changes how many rounds the deck allows, so both
  // adding and removing a player offer to recalculate.
  const suggestedForAdd = suggestedRounds(game.players.length + 1, cards);
  const suggestedForRemove = suggestedRounds(
    Math.max(game.players.length - 1, 1),
    cards,
  );

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
            icon: <Hash />,
            label: "Rundenanzahl anpassen",
            dialog: (trigger) => (
              <RoundsDialog game={game} onSetRoundCount={onSetRoundCount}>
                {trigger}
              </RoundsDialog>
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
        onAddPlayer={(name, emoji) => onAddPlayer(name, emoji, totalRounds)}
        onRemovePlayer={(playerId) => onRemovePlayer(playerId, totalRounds)}
        onRenamePlayer={onRenamePlayer}
        confirmAdd={({ name, emoji, done, cancel }) => (
          <>
            <DialogHeader>
              <DialogTitle>Rundenanzahl neu berechnen?</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              {name} kommt mit 0 Punkten und leeren Vorrunden dazu. Aktuell sind{" "}
              {totalRounds} Runden eingestellt, empfohlen für{" "}
              {game.players.length + 1} Spieler sind {suggestedForAdd} Runden.
            </DialogDescription>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <Button type="button" variant="secondary" onClick={cancel}>
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onAddPlayer(name, emoji, totalRounds);
                  done();
                }}
              >
                Beibehalten ({totalRounds} Runden)
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onAddPlayer(name, emoji, suggestedForAdd);
                  done();
                }}
              >
                Neu berechnen ({suggestedForAdd} Runden)
              </Button>
            </DialogFooter>
          </>
        )}
        confirmRemove={({ playerId, name, done, cancel }) => (
          <>
            <DialogHeader>
              <DialogTitle>{name} entfernen?</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Die Punkte von {name} gehen verloren. Aktuell sind {totalRounds}{" "}
              Runden eingestellt, empfohlen für{" "}
              {Math.max(game.players.length - 1, 1)} Spieler sind{" "}
              {suggestedForRemove} Runden.
            </DialogDescription>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <Button type="button" variant="secondary" onClick={cancel}>
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onRemovePlayer(playerId, totalRounds);
                  done();
                }}
              >
                Beibehalten ({totalRounds} Runden)
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onRemovePlayer(playerId, suggestedForRemove);
                  done();
                }}
              >
                Entfernen & neu berechnen ({suggestedForRemove} Runden)
              </Button>
            </DialogFooter>
          </>
        )}
      />
    </>
  );
}
