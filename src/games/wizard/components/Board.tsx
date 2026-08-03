"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ThemeManager from "@/components/common/seasonal/ThemeManager";
import { useSeasonalTheme } from "@/components/common/seasonal/useSeasonalTheme";
import { PageHeader } from "@/components/PageHeader";
import { RoundNav } from "@/games/shared/components/RoundNav";
import { Button } from "@/components/ui/button";
import {
  gamemodeFromSlug,
  gamemodeInformation,
  wizardGamemodes,
} from "../gamemodes";
import { HistoryTable } from "./HistoryTable";
import { useGame } from "../hooks/useGame";
import { RoundCard } from "./RoundCard";
import {
  allBidsEntered,
  firstOpenRound,
  isGameFinished,
  standings,
} from "../scoring";
import { ScoreDialog } from "@/games/shared/components/ScoreDialog";
import { shareConfigFor } from "../config";
import {
  loadHideScoresSetting,
  saveHideScoresSetting,
} from "../storage";
import { WizardPhase } from "../types";
import { Menu } from "./Menu";

export function Board() {
  const params = useParams();
  const router = useRouter();
  const gamemode = gamemodeFromSlug((params.gamemode as string) || "");
  const config = wizardGamemodes[gamemode];

  const {
    game,
    setRoundCount,
    setBid,
    setTricks,
    setBombTrick,
    setWolke,
    addPlayer,
    removePlayer,
    changeName,
    resetAll,
    resetRounds,
  } = useGame(gamemode);

  const [hideScores, setHideScores] = useState(() => loadHideScoresSetting());
  const { theme, isThemeActive, setIsThemeActive } = useSeasonalTheme();

  const toggleHideScores = () => {
    setHideScores((prev) => {
      const next = !prev;
      saveHideScoresSetting(next);
      return next;
    });
  };

  const [viewRoundIndex, setViewRoundIndex] = useState(() =>
    firstOpenRound(game),
  );
  const [viewPhase, setViewPhase] = useState<WizardPhase>(() => {
    const round = game.rounds[firstOpenRound(game)];
    return round && allBidsEntered(round, game.players) ? "tricks" : "bids";
  });

  // Rounds/players can shrink from underneath the current view (e.g. a
  // player removed, or the round count reduced) — keep it in bounds.
  useEffect(() => {
    setViewRoundIndex((prev) =>
      Math.min(prev, Math.max(game.rounds.length - 1, 0)),
    );
  }, [game.rounds.length]);

  const jumpToRound = (index: number) => {
    const clamped = Math.max(0, Math.min(index, game.rounds.length - 1));
    const round = game.rounds[clamped];
    setViewRoundIndex(clamped);
    setViewPhase(
      round && allBidsEntered(round, game.players) ? "tricks" : "bids",
    );
  };

  const handleAdvance = () => {
    jumpToRound(viewRoundIndex + 1);
    setViewPhase("bids");
  };

  const resumeRound = firstOpenRound(game);
  const finished = isGameFinished(game);
  const scoresRevealed = !hideScores || finished;

  const scoringPlayers = useMemo(() => standings(game), [game]);

  const elapsedMs =
    game.startedAt != null && game.finishedAt != null
      ? game.finishedAt - game.startedAt
      : null;

  const handleResetAll = () => {
    resetAll();
    router.push("/wizard");
  };

  if (game.players.length === 0) {
    return (
      <>
        <PageHeader backHref="/wizard" title={config.name} />
        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
          <p className="text-muted-foreground">
            Es sind noch keine Spieler in diesem Spiel.
          </p>
          <Link
            href="/wizard"
            className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"
          >
            Zurück zur Lobby
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        backHref="/wizard"
        title={config.name}
        right={
          <>
            {scoresRevealed ? (
              <ScoreDialog
                players={scoringPlayers}
                shareConfig={shareConfigFor(game)}
                elapsedMs={elapsedMs}
                trigger={
                  <Button
                    variant="outline"
                    className={
                      finished
                        ? "rounded-full dark:bg-yellow-400 bg-yellow-400 hover:bg-gray-500 dark:text-black"
                        : "rounded-full bg-white"
                    }
                  >
                    🏆
                    <span className="hidden sm:block">Punkteauswertung</span>
                  </Button>
                }
              />
            ) : (
              <Button
                variant="outline"
                disabled
                title="Punktestand ist versteckt"
                className="rounded-full bg-white"
              >
                <Lock size={16} />
                <span className="hidden sm:block">Versteckt</span>
              </Button>
            )}
            <Menu
              game={game}
              gamemodeInfo={gamemodeInformation(
                gamemode,
                game.plusMinusOne,
                game.specialCards,
              )}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onRenamePlayer={changeName}
              onSetRoundCount={setRoundCount}
              onResetRounds={resetRounds}
              onResetAll={handleResetAll}
              hideScores={hideScores}
              onToggleHideScores={toggleHideScores}
              seasonalTheme={theme}
              isThemeActive={isThemeActive}
              onToggleTheme={() => setIsThemeActive?.(!isThemeActive)}
            />
          </>
        }
      />

      <RoundNav
        index={viewRoundIndex}
        roundCount={game.rounds.length}
        currentRound={resumeRound}
        onJump={jumpToRound}
      />

      <div className="relative overflow-clip pb-8">
        <ThemeManager theme={theme} isThemeActive={isThemeActive ?? false} />
        <RoundCard
          game={game}
          roundIndex={viewRoundIndex}
          phase={viewPhase}
          onPhaseChange={setViewPhase}
          onSetBid={(playerId, value) => setBid(viewRoundIndex, playerId, value)}
          onSetTricks={(playerId, value) =>
            setTricks(viewRoundIndex, playerId, value)
          }
          onSetBombTrick={(value) => setBombTrick(viewRoundIndex, value)}
          onSetWolke={(wolke) => setWolke(viewRoundIndex, wolke)}
          onAdvance={handleAdvance}
          renderFinalAction={(disabled) => (
            <ScoreDialog
              players={scoringPlayers}
              shareConfig={shareConfigFor(game)}
              elapsedMs={elapsedMs}
              trigger={
                <Button
                  type="button"
                  className="rounded-full"
                  disabled={disabled}
                >
                  🏆 Punkteauswertung
                </Button>
              }
            />
          )}
        />

        <HistoryTable
          game={game}
          activeRound={viewRoundIndex}
          onSelectRound={jumpToRound}
          revealed={scoresRevealed}
        />
      </div>
    </>
  );
}
