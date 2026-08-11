"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GamemodePills } from "@/games/shared/components/GamemodePills";
import { GamemodeStats } from "@/games/shared/components/GamemodeStats";
import { LobbySection, LobbyShell } from "@/games/shared/components/LobbyShell";
import {
  MatchBadge,
  RecentMatches,
} from "@/games/shared/components/RecentMatches";
import { useMatchHistory } from "@/games/shared/hooks/useMatchHistory";
import { FLIP7_EMOJI } from "../config";
import { flip7Gamemodes, gamemodeSlug } from "../gamemodes";
import {
  DEFAULT_TARGET_SCORE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  createFlip7Game,
} from "../scoring";
import {
  flip7Storage,
  loadTargetScoreSetting,
  saveTargetScoreSetting,
} from "../storage";
import { Flip7GamemodeKey, Flip7Player } from "../types";
import { TargetScoreStepper } from "./TargetScoreStepper";

export function Lobby() {
  const router = useRouter();
  const [selectedGamemode, setSelectedGamemode] =
    useState<Flip7GamemodeKey>("Standard");
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE);
  const history = useMatchHistory(flip7Storage.loadMatches);

  // The last target a group agreed on is the one they most likely want again.
  useEffect(() => {
    const stored = loadTargetScoreSetting();
    if (stored != null) setTargetScore(stored);
  }, []);

  return (
    <LobbyShell
      title="Flip 7"
      emoji={FLIP7_EMOJI}
      minPlayers={MIN_PLAYERS}
      maxPlayers={MAX_PLAYERS}
      onStart={(selected) => {
        const players: Flip7Player[] = selected.map((p) => ({
          id: crypto.randomUUID(),
          name: p.name,
          emoji: p.emoji,
        }));
        saveTargetScoreSetting(targetScore);
        flip7Storage.saveGame(
          createFlip7Game(players, targetScore, selectedGamemode),
        );
        router.push(`/flip7/${gamemodeSlug(selectedGamemode)}`);
      }}
      footer={
        <>
          <GamemodeStats
            matches={history.filter((m) => m.gamemode === selectedGamemode)}
            modeName={flip7Gamemodes[selectedGamemode].name}
          />
          <RecentMatches
            matches={history}
            modeName={(match) =>
              flip7Gamemodes[match.gamemode]?.name ?? match.gamemode
            }
            badge={(match) => <MatchBadge>{match.targetScore}</MatchBadge>}
          />
        </>
      }
    >
      {() => (
        <>
          <LobbySection title="Spielmodus">
            <GamemodePills
              gamemodes={flip7Gamemodes}
              value={selectedGamemode}
              onChange={setSelectedGamemode}
            />
            <p className="text-sm text-muted-foreground">
              {flip7Gamemodes[selectedGamemode].description}
            </p>
          </LobbySection>

          <LobbySection title="Zielpunktzahl">
            <p className="text-sm text-muted-foreground">
              Die Partie endet, sobald am Rundenende jemand so viele Punkte hat.
            </p>
            <TargetScoreStepper value={targetScore} onChange={setTargetScore} />
          </LobbySection>
        </>
      )}
    </LobbyShell>
  );
}
