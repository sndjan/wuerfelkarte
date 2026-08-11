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
import { mostPlayedGamemode } from "@/games/shared/stats";
import { CABO_EMOJI } from "../config";
import { caboGamemodes, gamemodeSlug } from "../gamemodes";
import {
  DEFAULT_TARGET_SCORE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  createCaboGame,
} from "../scoring";
import {
  caboStorage,
  loadTargetScoreSetting,
  saveTargetScoreSetting,
} from "../storage";
import { CaboGamemodeKey, CaboPlayer } from "../types";
import { TargetScoreStepper } from "./TargetScoreStepper";

export function Lobby() {
  const router = useRouter();
  const [selectedGamemode, setSelectedGamemode] =
    useState<CaboGamemodeKey>("Standard");
  const [hasManualGamemode, setHasManualGamemode] = useState(false);
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE);
  const history = useMatchHistory(caboStorage.loadMatches);

  // The last target a group agreed on is the one they most likely want again.
  useEffect(() => {
    const stored = loadTargetScoreSetting();
    if (stored != null) setTargetScore(stored);
  }, []);

  // Once history loads, default to the group's most-played mode — unless
  // they've already picked one themselves.
  useEffect(() => {
    if (hasManualGamemode) return;
    const mostPlayed = mostPlayedGamemode(history);
    if (mostPlayed && mostPlayed in caboGamemodes) {
      setSelectedGamemode(mostPlayed as CaboGamemodeKey);
    }
  }, [history, hasManualGamemode]);

  return (
    <LobbyShell
      title="Cabo"
      emoji={CABO_EMOJI}
      minPlayers={MIN_PLAYERS}
      maxPlayers={MAX_PLAYERS}
      onStart={(selected) => {
        const players: CaboPlayer[] = selected.map((p) => ({
          id: crypto.randomUUID(),
          name: p.name,
          emoji: p.emoji,
        }));
        saveTargetScoreSetting(targetScore);
        caboStorage.saveGame(
          createCaboGame(players, targetScore, selectedGamemode),
        );
        router.push(`/cabo/${gamemodeSlug(selectedGamemode)}`);
      }}
      footer={
        <>
          <GamemodeStats
            matches={history.filter((m) => m.gamemode === selectedGamemode)}
            modeName={caboGamemodes[selectedGamemode].name}
            lowerIsBetter
          />
          <RecentMatches
            matches={history}
            modeName={(match) =>
              caboGamemodes[match.gamemode]?.name ?? match.gamemode
            }
            badge={(match) => <MatchBadge>{match.targetScore}</MatchBadge>}
            viewAllHref="/verlauf"
            lowerIsBetter
          />
        </>
      }
    >
      {() => (
        <>
          <LobbySection title="Spielmodus">
            <GamemodePills
              gamemodes={caboGamemodes}
              value={selectedGamemode}
              onChange={(mode) => {
                setHasManualGamemode(true);
                setSelectedGamemode(mode);
              }}
            />
            <p className="text-sm text-muted-foreground">
              {caboGamemodes[selectedGamemode].description}
            </p>
          </LobbySection>

          <LobbySection title="Zielpunktzahl">
            <p className="text-sm text-muted-foreground">
              Das Spiel endet, sobald am Rundenende jemand mehr Punkte als
              diese Zahl hat. Wer dann am wenigsten Punkte hat, gewinnt.
            </p>
            <TargetScoreStepper value={targetScore} onChange={setTargetScore} />
          </LobbySection>
        </>
      )}
    </LobbyShell>
  );
}
