"use client";

import type { ReactNode } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { usePlayerRoster } from "../hooks/usePlayerRoster";
import { activePlayers as sortActive } from "../roster";
import { RosterPlayer } from "../types";
import { AddPlayerDialog } from "./AddPlayerDialog";
import { PlayerChip } from "./PlayerChip";

/** A titled block in the lobby — every section looks the same. */
export function LobbySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

type LobbyShellProps = {
  /** Game name in the header and in the "braucht N–M Spieler" hint. */
  title: string;
  /** Prefixes the start button, e.g. "7️⃣ Spiel starten". */
  emoji: string;
  minPlayers: number;
  maxPlayers: number;
  /** Everything between the player list and the start button. */
  children: (players: RosterPlayer[]) => ReactNode;
  /** Statistics and match history, rendered below the start button. */
  footer?: ReactNode;
  onStart: (players: RosterPlayer[]) => void;
};

/**
 * The frame every lobby shares: the roster picker, the player-count rule, the
 * start button and the slots a game fills with its own setup controls.
 */
export function LobbyShell({
  title,
  emoji,
  minPlayers,
  maxPlayers,
  children,
  footer,
  onStart,
}: LobbyShellProps) {
  const {
    roster,
    addPlayer,
    toggleActive,
    renamePlayer,
    changeEmoji,
    removePlayer,
  } = usePlayerRoster();

  const selected = sortActive(roster);
  const selectionNumbers = new Map(
    selected.map((player, index) => [player.id, index + 1]),
  );

  const canStart =
    selected.length >= minPlayers && selected.length <= maxPlayers;

  return (
    <>
      <PageHeader backHref="/" title={title} />
      <div className="flex flex-col gap-6 px-4 pb-8">
        <LobbySection title="Spieler">
          <div className="flex flex-wrap items-center gap-2">
            {roster.map((player) => (
              <PlayerChip
                key={player.id}
                player={player}
                selectionNumber={selectionNumbers.get(player.id)}
                onToggleActive={toggleActive}
                onRename={renamePlayer}
                onChangeEmoji={changeEmoji}
                onRemove={removePlayer}
              />
            ))}
            <AddPlayerDialog onAdd={addPlayer} />
          </div>
          {!canStart && selected.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {title} braucht {minPlayers}–{maxPlayers} Spieler (aktuell{" "}
              {selected.length}).
            </p>
          )}
        </LobbySection>

        {children(selected)}

        <button
          type="button"
          onClick={() => canStart && onStart(selected)}
          disabled={!canStart}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {emoji} Spiel starten
        </button>

        {footer}
      </div>
    </>
  );
}
