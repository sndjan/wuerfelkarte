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
import { DARTS_EMOJI } from "../config";
import { dartsGamemodes, gamemodeSlug } from "../gamemodes";
import {
  DEFAULT_IN_RULE,
  DEFAULT_LEGS_TO_WIN,
  DEFAULT_OUT_RULE,
  DEFAULT_START_SCORE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  createDartsGame,
} from "../scoring";
import { dartsStorage, loadSetupSettings, saveSetupSettings } from "../storage";
import {
  DartsGamemodeKey,
  DartsInRule,
  DartsOutRule,
  DartsPlayer,
} from "../types";
import { CheckoutRulesPicker } from "./CheckoutRulesPicker";
import { LegsStepper } from "./LegsStepper";
import { StartScorePicker } from "./StartScorePicker";

export function Lobby() {
  const router = useRouter();
  const [selectedGamemode, setSelectedGamemode] =
    useState<DartsGamemodeKey>("X01");
  const [hasManualGamemode, setHasManualGamemode] = useState(false);
  const [startScore, setStartScore] = useState(DEFAULT_START_SCORE);
  const [inRule, setInRule] = useState<DartsInRule>(DEFAULT_IN_RULE);
  const [outRule, setOutRule] = useState<DartsOutRule>(DEFAULT_OUT_RULE);
  const [legsToWin, setLegsToWin] = useState(DEFAULT_LEGS_TO_WIN);
  const history = useMatchHistory(dartsStorage.loadMatches);

  // The setup a group last played is the one they most likely want again.
  useEffect(() => {
    const stored = loadSetupSettings();
    if (stored.startScore != null) setStartScore(stored.startScore);
    if (stored.inRule != null) setInRule(stored.inRule);
    if (stored.outRule != null) setOutRule(stored.outRule);
    if (stored.legsToWin != null) setLegsToWin(stored.legsToWin);
  }, []);

  // Once history loads, default to the group's most-played mode — unless
  // they've already picked one themselves.
  useEffect(() => {
    if (hasManualGamemode) return;
    const mostPlayed = mostPlayedGamemode(history);
    if (mostPlayed && mostPlayed in dartsGamemodes) {
      setSelectedGamemode(mostPlayed as DartsGamemodeKey);
    }
  }, [history, hasManualGamemode]);

  return (
    <LobbyShell
      title="Darts"
      emoji={DARTS_EMOJI}
      minPlayers={MIN_PLAYERS}
      maxPlayers={MAX_PLAYERS}
      onStart={(selected) => {
        const players: DartsPlayer[] = selected.map((p) => ({
          id: crypto.randomUUID(),
          name: p.name,
          emoji: p.emoji,
        }));
        saveSetupSettings({ startScore, inRule, outRule, legsToWin });
        dartsStorage.saveGame(
          createDartsGame(
            players,
            { startScore, inRule, outRule, legsToWin },
            selectedGamemode,
          ),
        );
        router.push(`/darts/${gamemodeSlug(selectedGamemode)}`);
      }}
      footer={
        <>
          <GamemodeStats
            matches={history.filter((m) => m.gamemode === selectedGamemode)}
            modeName={dartsGamemodes[selectedGamemode].name}
          />
          <RecentMatches
            matches={history}
            modeName={(match) =>
              dartsGamemodes[match.gamemode]?.name ?? match.gamemode
            }
            badge={(match) => <MatchBadge>{match.startScore}</MatchBadge>}
            viewAllHref="/verlauf"
          />
        </>
      }
    >
      {() => (
        <>
          <LobbySection title="Spielmodus">
            <GamemodePills
              gamemodes={dartsGamemodes}
              value={selectedGamemode}
              onChange={(mode) => {
                setHasManualGamemode(true);
                setSelectedGamemode(mode);
              }}
            />
            <p className="text-sm text-muted-foreground">
              {dartsGamemodes[selectedGamemode].description}
            </p>
          </LobbySection>

          <LobbySection title="Startpunkte">
            <StartScorePicker value={startScore} onChange={setStartScore} />
          </LobbySection>

          <LobbySection title="Regeln">
            <CheckoutRulesPicker
              inRule={inRule}
              outRule={outRule}
              onChangeInRule={setInRule}
              onChangeOutRule={setOutRule}
            />
          </LobbySection>

          <LobbySection title="Legs">
            <LegsStepper value={legsToWin} onChange={setLegsToWin} />
          </LobbySection>
        </>
      )}
    </LobbyShell>
  );
}
