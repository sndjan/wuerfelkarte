"use client";

import { Emoji } from "@/components/emoji/Emoji";
import { Eye, EyeOff, RotateCcw, UserRoundPlus } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
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
import { isMatchComplete } from "../scoring";
import {
  loadChaosSettings,
  loadHideScores,
  saveChaosSetting,
  saveHideScores,
  YatzyGame,
  gameFromMatch,
  yatzyStorage,
} from "../storage";
import { Player, Points } from "../types";
import { useHideScores } from "@/games/shared/hooks/useHideScores";
import { loadScanCheck, updateScanCheck } from "@/games/scan/handoff";
import { ChaosMissions } from "./ChaosMissions";
import { Menu } from "./Menu";
import { EditPlayer } from "./EditPlayer";
import { ScoreTable } from "./ScoreTable";
import { ResetPointsDialog } from "./ResetPointsDialog";

export function Board() {
  const params = useParams();
  const gamemode = gamemodeFromSlug((params.gamemode as string) || "");
  const config = gamemodes[gamemode];

  // A reload picks the running sheet back up. Opening a "Letzte Spiele" entry
  // seeds the board with that match's sheet instead, so it can be reviewed or
  // corrected — unless the running sheet already is that match, as it then
  // holds the newer edits. Without either, the lobby's seating starts fresh.
  const searchParams = useSearchParams();
  const viewMatchId = searchParams.get("matchId");
  const seed = useMemo((): YatzyGame | null => {
    const running = yatzyStorage.loadGame();
    if (!viewMatchId) {
      return running?.gamemode === gamemode ? running : null;
    }
    if (running?.id === viewMatchId) return running;
    const match = yatzyStorage
      .loadMatches()
      .find((m) => m.id === viewMatchId);
    if (!match || !match.players.every((p) => p.points)) return null;
    return gameFromMatch(match);
  }, [viewMatchId, gamemode]);
  const seedPlayers = seed?.players;

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
  } = useGame(gamemode, seedPlayers);
  const { theme, isThemeActive, setIsThemeActive } = useSeasonalTheme();

  // Shared by the header button and the menu entry — both open the same dialog.
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);

  const isBattle = gamemode === "Battle";
  // Battle: composite keys `${playerId}::${fieldKey}` flagging doubled fields.
  const dkey = (playerId: number, field: string) => `${playerId}::${field}`;
  const [doubled, setDoubled] = useState<Set<string>>(() => {
    if (!seed) return new Set();
    const seeded = new Set<string>();
    seed.players.forEach((mp, index) => {
      const player = players[index];
      if (!player || !mp.doubled) return;
      mp.doubled.forEach((field) => seeded.add(dkey(player.id, field)));
    });
    return seeded;
  });
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

  const [gameStartTime, setGameStartTime] = useState<number | null>(
    () => seed?.startedAt ?? null,
  );
  const [gameEndTime, setGameEndTime] = useState<number | null>(
    () => seed?.finishedAt ?? null,
  );
  // Identifies this sitting in the history, so re-opening the scoreboard
  // updates the entry instead of adding another one.
  const [matchId, setMatchId] = useState(
    () => seed?.id ?? crypto.randomUUID(),
  );

  const [missions, setMissions] = useState<Mission[]>(
    () => seed?.missions ?? [],
  );
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0);
  const [missionEveryRound, setMissionEveryRound] = useState(
    () => loadChaosSettings().missionEveryRound,
  );
  const [balancedMode, setBalancedMode] = useState(
    () => loadChaosSettings().balancedMode,
  );
  const chaosRoundInterval = missionEveryRound ? 1 : 2;
  const [hideScores, toggleHideScores] = useHideScores(loadHideScores, saveHideScores);

  const handleResetAll = () => {
    resetAll();
    setDoubled(new Set());
    setGameStartTime(null);
    setGameEndTime(null);
    setMatchId(crypto.randomUUID());
    setScanCheck({});
  };

  const handleResetAllPoints = () => {
    resetAllPoints();
    setDoubled(new Set());
    setGameStartTime(null);
    setGameEndTime(null);
    setMatchId(crypto.randomUUID());
    setScanCheck({});
  };

  const prevMissionIndexRef = useRef<number>(-1);

  // The settings the current missions were drawn under. A restored sheet keeps
  // its missions; only changing a setting draws new ones.
  const missionsDrawnFor = useRef<string | null>(
    seed?.missions?.length ? `${chaosRoundInterval}:${balancedMode}` : null,
  );

  useEffect(() => {
    if (gamemode !== "Chaoswunder") {
      setCurrentMissionIndex(0);
      setMissions([]);
      return;
    }
    const drawKey = `${chaosRoundInterval}:${balancedMode}`;
    if (missionsDrawnFor.current === drawKey) return;
    missionsDrawnFor.current = drawKey;
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

  // A sheet taken over from the paper block marks the fields to check, by player name.
  const [scanCheck, setScanCheck] = useState(() => loadScanCheck(seed?.id));
  const flaggedOf = (playerId: number) =>
    new Set(scanCheck[players.find((p) => p.id === playerId)?.name ?? ""] ?? []);
  const unflag = (playerId: number, keys: string[]) => {
    const name = players.find((p) => p.id === playerId)?.name;
    if (!name || !scanCheck[name]?.some((k) => keys.includes(k))) return;
    const next = { ...scanCheck, [name]: scanCheck[name].filter((k) => !keys.includes(k)) };
    setScanCheck(next);
    updateScanCheck(matchId, next);
  };
  const toCheck = Object.values(scanCheck).reduce((n, keys) => n + keys.length, 0);

  const handleUpdatePoints = (playerId: number, points: Partial<Points>) => {
    unflag(playerId, Object.keys(points));
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
    updatePoints(playerId, points);
  };

  const gameFinished = useMemo(
    () => isMatchComplete(players, gamemode),
    [players, gamemode],
  );

  // The timer stops the moment the last field is filled in, before the
  // scoreboard is ever opened, so the saved duration is actual play time.
  useEffect(() => {
    if (gameFinished) setGameEndTime((prev) => prev ?? Date.now());
  }, [gameFinished]);

  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);

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

  useEffect(() => {
    yatzyStorage.saveGame({
      id: matchId,
      gamemode,
      players: scoringPlayers.map(({ name, emoji, points, doubled }) => ({
        name,
        emoji,
        points,
        ...(doubled.length > 0 ? { doubled } : {}),
      })),
      startedAt: gameStartTime,
      finishedAt: gameEndTime,
      ...(missions.length > 0 ? { missions } : {}),
    });
  }, [matchId, gamemode, scoringPlayers, gameStartTime, gameEndTime, missions]);

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
              open={scoreDialogOpen}
              onNewGame={handleResetAllPoints}
              onOpenChange={(open) => {
                setScoreDialogOpen(open);
                if (open) saveMatch();
              }}
              trigger={
                <Button
                  variant="outline"
                  className={
                    gameFinished
                      ? "rounded-full bg-gold text-on-gold hover:bg-gold/90"
                      : "rounded-full bg-surface"
                  }
                >
                  <Emoji e="🏆" />
                  <span className="hidden md:block">Auswertung</span>
                </Button>
              }
            />
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-full bg-surface"
              aria-pressed={hideScores}
              aria-label={hideScores ? "Summen zeigen" : "Summen verdecken"}
              onClick={toggleHideScores}
            >
              {hideScores ? <EyeOff /> : <Eye />}
            </Button>
            <div className="hidden lg:block">
              <Button
                variant="outline"
                className="rounded-full bg-surface"
                aria-label="Spieler hinzufügen"
                onClick={() => setAddPlayerOpen(true)}
              >
                <UserRoundPlus />
              </Button>
            </div>
            <div className="hidden lg:block">
              <ResetPointsDialog onConfirm={handleResetAllPoints}>
                <Button variant="outline" className="rounded-full bg-surface">
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

      <main className="mx-auto flex min-h-[calc(100dvh-80px)] w-full max-w-[1180px] flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-8">
        {toCheck > 0 && (
          <div role="status" className="mb-3 flex items-center gap-3 rounded-md border border-gold bg-surface px-4 py-2 text-sm">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-extrabold text-on-gold">?</span>
            <p className="flex-1">
              Vom Papierblock übernommen: {toCheck === 1 ? "ein Feld" : `${toCheck} Felder`} bitte prüfen.
            </p>
            <button
              type="button"
              className="shrink-0 rounded-full px-2 py-1 font-bold text-ink-muted hover:bg-secondary"
              onClick={() => {
                setScanCheck({});
                updateScanCheck(matchId, {});
              }}
            >
              Passt
            </button>
          </div>
        )}
        <ScoreTable
          players={players}
          gamemode={gamemode}
          hideScores={hideScores}
          scoreOf={(player: Player) =>
            isBattle ? battleTotalScore(player.points, playerDoubledSet(player.id), config) : player.score
          }
          doubledOf={isBattle ? playerDoubledSet : undefined}
          flaggedOf={toCheck > 0 ? flaggedOf : undefined}
          battleStatus={
            isBattle
              ? (playerId: number, key: string): BattleFieldStatus => getBattleFieldStatus(players, key, playerId)
              : undefined
          }
          onEnter={(playerId, key, value) => handleUpdatePoints(playerId, { [key]: value } as Partial<Points>)}
          playerMenu={(player, trigger) => (
            <EditPlayer
              playerName={player.name}
              playerEmoji={player.emoji}
              takenNames={players.map((p) => p.name)}
              resetPoints={() => {
                resetPoints(player.id);
                if (isBattle) clearPlayerDoubled(player.id);
              }}
              removePlayer={() => {
                removePlayer(player.id);
                if (isBattle) clearPlayerDoubled(player.id);
              }}
              changeName={(name, emoji) => changeName(player.id, name, emoji)}
              moveToRight={() => moveToRight(player.id)}
              moveToLeft={() => moveToLeft(player.id)}
              trigger={trigger}
            />
          )}
          theme={theme}
          isThemeActive={isThemeActive ?? false}
        />
      </main>

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
