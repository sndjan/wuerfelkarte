"use client";

import { RotateCcw, UserRoundPlus } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useSeasonalTheme } from "@/components/common/seasonal/useSeasonalTheme";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { PlayerIdentityDialog } from "@/games/shared/components/PlayerIdentityDialog";
import { ScoreDialog } from "@/games/shared/components/ScoreDialog";
import { gamemodeFromSlug, shareConfig } from "../config";
import { gamemodes } from "../gamemodes";
import {
  BattleFieldStatus,
  battleTotalScore,
  getBattleFieldStatus,
  isForcedSuccess,
} from "../gamemodes/battle";
import { Mission, selectMissions } from "../gamemodes/chaoswunder";
import { useGame } from "../hooks/useGame";
import { loadChaosSettings, saveChaosSetting, yatzyStorage } from "../storage";
import { Points } from "../types";
import { ChaosMissions } from "./ChaosMissions";
import { Menu } from "./Menu";
import PlayerCard from "./PlayerCard";
import { ResetPointsDialog } from "./ResetPointsDialog";

export function Board() {
  const params = useParams();
  const gamemode = gamemodeFromSlug((params.gamemode as string) || "");
  const config = gamemodes[gamemode];

  const {
    players,
    addPlayer,
    updatePoints,
    resetPoints,
    removePlayer,
    changeName,
    moveToRight,
    moveToLeft,
    resetAll,
    resetAllPoints,
  } = useGame(gamemode);
  const { theme, isThemeActive, setIsThemeActive } = useSeasonalTheme();

  // Shared by the header button and the menu entry — both open the same dialog.
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);

  const isBattle = gamemode === "Battle";
  // Battle: composite keys `${playerId}::${fieldKey}` flagging doubled fields.
  const [doubled, setDoubled] = useState<Set<string>>(new Set());
  const dkey = (playerId: number, field: string) => `${playerId}::${field}`;
  const playerDoubledSet = (playerId: number) =>
    new Set(
      config.fields
        .filter((f) => doubled.has(dkey(playerId, f.key)))
        .map((f) => f.key),
    );
  const clearPlayerDoubled = (playerId: number) =>
    setDoubled((prev) => {
      const next = new Set(prev);
      config.fields.forEach((f) => next.delete(dkey(playerId, f.key)));
      return next;
    });

  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [gameEndTime, setGameEndTime] = useState<number | null>(null);
  // Identifies this sitting in the history, so re-opening the scoreboard
  // updates the entry instead of adding another one.
  const [matchId, setMatchId] = useState(() => crypto.randomUUID());

  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0);
  const [missionEveryRound, setMissionEveryRound] = useState(
    () => loadChaosSettings().missionEveryRound,
  );
  const [balancedMode, setBalancedMode] = useState(
    () => loadChaosSettings().balancedMode,
  );
  const chaosRoundInterval = missionEveryRound ? 1 : 2;

  const handleResetAll = () => {
    resetAll();
    setDoubled(new Set());
    setGameStartTime(null);
    setGameEndTime(null);
    setMatchId(crypto.randomUUID());
  };

  const handleResetAllPoints = () => {
    resetAllPoints();
    setDoubled(new Set());
    setGameStartTime(null);
    setGameEndTime(null);
    setMatchId(crypto.randomUUID());
  };

  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevMissionIndexRef = useRef<number>(-1);

  useEffect(() => {
    document
      .getElementById("player-container")
      ?.scrollTo({ left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (gamemode !== "Chaoswunder") {
      setCurrentMissionIndex(0);
      setMissions([]);
      return;
    }
    setCurrentMissionIndex(0);
    prevMissionIndexRef.current = -1;
    setMissions(selectMissions(chaosRoundInterval, balancedMode));
  }, [gamemode, missionEveryRound, balancedMode, chaosRoundInterval]);

  const chaosRoundsPlayed = useMemo(() => {
    if (gamemode !== "Chaoswunder" || players.length === 0) return 0;
    return Math.min(
      ...players.map(
        (player) =>
          Object.values(player.points).filter((point) => point !== 0).length,
      ),
    );
  }, [gamemode, players]);

  useEffect(() => {
    if (
      gamemode !== "Chaoswunder" ||
      missions.length === 0 ||
      players.length === 0
    ) {
      return;
    }
    const newIndex = Math.min(
      Math.floor(chaosRoundsPlayed / chaosRoundInterval),
      missions.length - 1,
    );
    setCurrentMissionIndex(newIndex);
    if (
      newIndex > prevMissionIndexRef.current &&
      prevMissionIndexRef.current !== -1
    ) {
      toast.warning(`Mission ${newIndex + 1} ist aktiv!`);
    }
    prevMissionIndexRef.current = newIndex;
  }, [
    gamemode,
    missions.length,
    players.length,
    chaosRoundsPlayed,
    chaosRoundInterval,
  ]);

  const handleUpdatePoints = (playerId: number, points: Partial<Points>) => {
    setGameStartTime((prev) => prev ?? Date.now());
    if (isBattle) {
      setDoubled((prev) => {
        const next = new Set(prev);
        for (const [key, value] of Object.entries(points)) {
          if (
            typeof value === "number" &&
            value > 0 &&
            isForcedSuccess(players, key, playerId)
          ) {
            next.add(dkey(playerId, key));
          } else {
            next.delete(dkey(playerId, key));
          }
        }
        return next;
      });
    }
    const currentIndex = players.findIndex((player) => player.id === playerId);
    updatePoints(playerId, points);

    // Bring the next player's card into view once the DOM has caught up.
    setTimeout(() => {
      const nextIndex = (currentIndex + 1) % players.length;
      const container = document.getElementById("player-container");
      const targetElement = playerRefs.current[nextIndex];
      if (container && targetElement) {
        container.scrollTo({
          left:
            targetElement.offsetLeft -
            container.offsetLeft -
            container.clientWidth / 2 +
            targetElement.offsetWidth / 2,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const gameFinished = useMemo(() => {
    const fields = config?.fields.map((f) => f.key) ?? [];
    if (players.length === 0) return false;
    if (isBattle) {
      // Each field is done when someone claimed it, or everyone crossed it.
      return fields.every((key) => {
        const claimed = players.some((p) => {
          const v = p.points[key as keyof typeof p.points];
          return typeof v === "number" && v !== 0;
        });
        if (claimed) return true;
        return players.every(
          (p) => p.points[key as keyof typeof p.points] === "X",
        );
      });
    }
    return players.every((player) =>
      fields.every((key) => {
        const point = player.points[key as keyof typeof player.points];
        return point !== undefined && point !== 0;
      }),
    );
  }, [players, config, isBattle]);

  // The timer stops the moment the last field is filled in, before the
  // scoreboard is ever opened, so the saved duration is actual play time.
  useEffect(() => {
    if (gameFinished) setGameEndTime((prev) => prev ?? Date.now());
  }, [gameFinished]);

  const elapsedMs =
    gameStartTime !== null && gameEndTime !== null
      ? gameEndTime - gameStartTime
      : null;

  const scoringPlayers = useMemo(
    () =>
      players.map((player) => ({
        id: String(player.id),
        name: player.name,
        emoji: player.emoji,
        score: isBattle
          ? battleTotalScore(player.points, playerDoubledSet(player.id), config)
          : player.score,
        points: player.points,
        doubled: isBattle ? Array.from(playerDoubledSet(player.id)) : [],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isBattle, players, config, doubled],
  );

  /** Records the result, upserting so a correction updates its own entry. */
  const saveMatch = () => {
    if (!scoringPlayers.some((player) => player.score > 0)) return;
    yatzyStorage.saveMatch({
      id: matchId,
      players: scoringPlayers.map(({ name, emoji, score, points, doubled }) => ({
        name,
        ...(emoji ? { emoji } : {}),
        score,
        points,
        ...(doubled.length > 0 ? { doubled } : {}),
      })),
      gamemode,
      timestamp: new Date().toISOString(),
      ...(elapsedMs !== null ? { durationMs: elapsedMs } : {}),
    });
  };

  return (
    <>
      <PageHeader
        backHref="/yatzy"
        title={config.name}
        right={
          <>
            <ScoreDialog
              players={scoringPlayers}
              shareConfig={shareConfig(gamemode)}
              elapsedMs={elapsedMs}
              onOpenChange={(open) => open && saveMatch()}
              trigger={
                <Button
                  variant="outline"
                  className={
                    gameFinished
                      ? "rounded-full bg-yellow-400 hover:bg-gray-500 dark:bg-yellow-400 dark:text-black"
                      : "rounded-full bg-white"
                  }
                >
                  🏆
                  <span className="hidden sm:block">Punkteauswertung</span>
                </Button>
              }
            />
            <div className="hidden sm:block">
              <Button
                variant="outline"
                className="rounded-full bg-white"
                aria-label="Spieler hinzufügen"
                onClick={() => setAddPlayerOpen(true)}
              >
                <UserRoundPlus />
              </Button>
            </div>
            <div className="hidden sm:block">
              <ResetPointsDialog onConfirm={handleResetAllPoints}>
                <Button variant="outline" className="rounded-full bg-white">
                  <RotateCcw />
                </Button>
              </ResetPointsDialog>
            </div>
            <Menu
              gamemodeInfo={config.information}
              onAddPlayer={() => setAddPlayerOpen(true)}
              onResetPoints={handleResetAllPoints}
              onResetAll={handleResetAll}
              seasonalTheme={theme}
              isThemeActive={isThemeActive}
              onToggleTheme={() => setIsThemeActive?.(!isThemeActive)}
            />
          </>
        }
      />

      {gamemode === "Chaoswunder" && (
        <ChaosMissions
          missions={missions}
          currentIndex={currentMissionIndex}
          roundsPlayed={chaosRoundsPlayed}
          interval={chaosRoundInterval}
          missionEveryRound={missionEveryRound}
          onToggleMissionEveryRound={() => {
            const next = !missionEveryRound;
            setMissionEveryRound(next);
            saveChaosSetting("missionEveryRound", next);
          }}
          balancedMode={balancedMode}
          onToggleBalancedMode={() => {
            const next = !balancedMode;
            setBalancedMode(next);
            saveChaosSetting("balancedMode", next);
          }}
        />
      )}

      <div
        className="no-scrollbar snap-x snap-mandatory overflow-x-auto px-4 pb-24"
        style={{ scrollbarWidth: "none" }}
        id="player-container"
      >
        <div
          className={`flex flex-row gap-4 ${
            players.length > 2 ? "min-w-max" : ""
          }`}
        >
          {players.map((player, index) => {
            const battleFieldStatus = isBattle
              ? (Object.fromEntries(
                  config.fields.map((f) => [
                    f.key,
                    getBattleFieldStatus(players, f.key, player.id),
                  ]),
                ) as Record<string, BattleFieldStatus>)
              : undefined;
            return (
              <div
                className="snap-center"
                key={player.id}
                ref={(el) => {
                  playerRefs.current[index] = el;
                }}
                style={{ width: "calc(50% - 8px)" }}
              >
                <PlayerCard
                  playerName={player.name}
                  playerEmoji={player.emoji}
                  playerPoints={player.points}
                  updatePoints={(points: Partial<Points>) =>
                    handleUpdatePoints(player.id, points)
                  }
                  resetPoints={() => {
                    resetPoints(player.id);
                    if (isBattle) clearPlayerDoubled(player.id);
                  }}
                  removePlayer={() => {
                    removePlayer(player.id);
                    if (isBattle) clearPlayerDoubled(player.id);
                  }}
                  changeName={(name, emoji) =>
                    changeName(player.id, name, emoji)
                  }
                  takenNames={players.map((p) => p.name)}
                  moveToRight={() => moveToRight(player.id)}
                  moveToLeft={() => moveToLeft(player.id)}
                  gamemode={gamemode}
                  theme={theme}
                  isThemeActive={isThemeActive}
                  battleFieldStatus={battleFieldStatus}
                  doubledFields={
                    isBattle ? playerDoubledSet(player.id) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <PlayerIdentityDialog
        variant="add"
        open={addPlayerOpen}
        onOpenChange={setAddPlayerOpen}
        takenNames={players.map((p) => p.name)}
        onApply={(name, emoji) => addPlayer(name, emoji)}
      />
    </>
  );
}
