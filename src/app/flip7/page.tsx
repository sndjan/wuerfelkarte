"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AddPlayerDialog } from "@/components/yatzy-lobby/AddPlayerDialog";
import { PlayerChip } from "@/components/yatzy-lobby/PlayerChip";
import { usePlayerRoster } from "@/components/hooks/usePlayerRoster";
import { flip7Gamemodes, gamemodeSlug } from "@/components/flip7/gamemodes";
import { Flip7GamemodePillSelector } from "@/components/flip7/Flip7GamemodePillSelector";
import { Flip7GamemodeStats } from "@/components/flip7/Flip7GamemodeStats";
import { Flip7RecentMatchesList } from "@/components/flip7/Flip7RecentMatchesList";
import {
  DEFAULT_TARGET_SCORE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  createFlip7Game,
} from "@/components/flip7/scoring";
import {
  loadTargetScoreSetting,
  saveFlip7Game,
  saveTargetScoreSetting,
} from "@/components/flip7/storage";
import { TargetScoreStepper } from "@/components/flip7/TargetScoreStepper";
import { Flip7GamemodeKey, Flip7Player } from "@/components/flip7/types";

export default function Flip7Lobby() {
  const router = useRouter();
  const {
    roster,
    addPlayer,
    toggleActive,
    renamePlayer,
    changeEmoji,
    removePlayer,
  } = usePlayerRoster();
  const [selectedGamemode, setSelectedGamemode] =
    useState<Flip7GamemodeKey>("Standard");
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE);

  // The last target a group agreed on is the one they most likely want again.
  useEffect(() => {
    const stored = loadTargetScoreSetting();
    if (stored != null) setTargetScore(stored);
  }, []);

  const activePlayers = roster
    .filter((player) => player.active)
    .sort((a, b) => (a.selectionOrder ?? 0) - (b.selectionOrder ?? 0));

  const selectionNumbers = new Map(
    activePlayers.map((player, index) => [player.id, index + 1]),
  );

  const canStart =
    activePlayers.length >= MIN_PLAYERS && activePlayers.length <= MAX_PLAYERS;

  const handleStart = () => {
    if (!canStart) return;
    const players: Flip7Player[] = activePlayers.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      emoji: p.emoji,
    }));
    saveTargetScoreSetting(targetScore);
    saveFlip7Game(createFlip7Game(players, targetScore, selectedGamemode));
    router.push(`/flip7/${gamemodeSlug(selectedGamemode)}`);
  };

  return (
    <>
      <PageHeader backHref="/" title="Flip 7" />
      <div className="flex flex-col gap-6 px-4 pb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Spieler
          </h2>
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
          {!canStart && activePlayers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Flip 7 braucht {MIN_PLAYERS}–{MAX_PLAYERS} Spieler (aktuell{" "}
              {activePlayers.length}).
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Spielmodus
          </h2>
          <Flip7GamemodePillSelector
            value={selectedGamemode}
            onChange={setSelectedGamemode}
          />
          <p className="text-sm text-muted-foreground">
            {flip7Gamemodes[selectedGamemode].description}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Zielpunktzahl
          </h2>
          <p className="text-sm text-muted-foreground">
            Die Partie endet, sobald am Rundenende jemand so viele Punkte hat.
          </p>
          <TargetScoreStepper value={targetScore} onChange={setTargetScore} />
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          7️⃣ Spiel starten
        </button>

        <Flip7GamemodeStats gamemode={selectedGamemode} />

        <Flip7RecentMatchesList />
      </div>
    </>
  );
}
