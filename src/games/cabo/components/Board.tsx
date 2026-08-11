"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ThemeManager from "@/components/common/seasonal/ThemeManager";
import { useSeasonalTheme } from "@/components/common/seasonal/useSeasonalTheme";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundNav } from "@/games/shared/components/RoundNav";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu } from "./Menu";
import {
  caboGamemodes,
  gamemodeFromSlug,
  gamemodeInformation,
} from "../gamemodes";
import { HistoryTable } from "./HistoryTable";
import { useGame } from "../hooks/useGame";
import { RoundCard } from "./RoundCard";
import { firstOpenRound, standings } from "../scoring";
import { ScoreDialog } from "@/games/shared/components/ScoreDialog";
import { shareConfigFor } from "../config";
import { loadHideScoresSetting, saveHideScoresSetting } from "../storage";
import { TargetReachedDialog } from "./TargetReachedDialog";

export function Board() {
  const params = useParams();
  const router = useRouter();
  const gamemode = gamemodeFromSlug((params.gamemode as string) || "");
  const config = caboGamemodes[gamemode];

  const {
    game,
    setCardSum,
    setCalledCabo,
    setSpecialHand,
    addRound,
    finishGame,
    resumeGame,
    setTargetScore,
    addPlayer,
    removePlayer,
    changeName,
    resetAll,
    resetRounds,
  } = useGame(gamemode);

  const [hideScores, setHideScores] = useState(() => loadHideScoresSetting());
  const { theme, isThemeActive, setIsThemeActive } = useSeasonalTheme();
  const [targetPromptOpen, setTargetPromptOpen] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(false);

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

  // Rounds can disappear from underneath the current view (finishing drops an
  // untouched trailing round, resetting clears them) — keep it in bounds.
  useEffect(() => {
    setViewRoundIndex((prev) =>
      Math.min(prev, Math.max(game.rounds.length - 1, 0)),
    );
  }, [game.rounds.length]);

  const jumpToRound = (index: number) =>
    setViewRoundIndex(Math.max(0, Math.min(index, game.rounds.length - 1)));

  const resumeRound = firstOpenRound(game);
  const finished = game.finishedAt != null;
  const scoresRevealed = !hideScores || finished;

  // Lowest first: the front of the list is who is winning right now.
  const scoringPlayers = useMemo(() => standings(game), [game]);
  const leader = scoringPlayers[0];
  const worst = scoringPlayers[scoringPlayers.length - 1];

  const elapsedMs =
    game.startedAt != null && game.finishedAt != null
      ? game.finishedAt - game.startedAt
      : null;

  const handleAdvance = () => {
    // Only the last round appends; browsing back and re-confirming just moves on.
    // The index is set straight rather than through `jumpToRound`, whose clamp
    // would still see the pre-append round count and swallow the step.
    if (viewRoundIndex === game.rounds.length - 1) addRound();
    setViewRoundIndex(viewRoundIndex + 1);
  };

  const handleShowScores = () => {
    setTargetPromptOpen(false);
    finishGame();
    setScoresOpen(true);
  };

  const handleContinue = () => {
    setTargetPromptOpen(false);
    handleAdvance();
  };

  const handleResume = () => {
    resumeGame();
    setViewRoundIndex(game.rounds.length);
  };

  const handleResetAll = () => {
    resetAll();
    router.push("/cabo");
  };

  if (game.players.length === 0) {
    return (
      <>
        <PageHeader backHref="/cabo" title={config.name} />
        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
          <p className="text-muted-foreground">
            Es sind noch keine Spieler in diesem Spiel.
          </p>
          <Link
            href="/cabo"
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
        backHref="/cabo"
        title="Cabo"
        right={
          <>
            {scoresRevealed ? (
              <Button
                variant="outline"
                onClick={() => setScoresOpen(true)}
                className={
                  finished
                    ? "rounded-full dark:bg-yellow-400 bg-yellow-400 hover:bg-gray-500 dark:text-black"
                    : "rounded-full bg-white"
                }
              >
                🏆
                <span className="hidden sm:block">Punkteauswertung</span>
              </Button>
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
              gamemodeInfo={gamemodeInformation(gamemode, game.targetScore)}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onRenamePlayer={changeName}
              onSetTargetScore={setTargetScore}
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
          onSetCardSum={(playerId, value) =>
            setCardSum(viewRoundIndex, playerId, value)
          }
          onSetCalledCabo={(playerId, called) =>
            setCalledCabo(viewRoundIndex, playerId, called)
          }
          onSetSpecialHand={(playerId, special) =>
            setSpecialHand(viewRoundIndex, playerId, special)
          }
          onAdvance={handleAdvance}
          onTargetReached={() => setTargetPromptOpen(true)}
          renderFinishedAction={() => (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="rounded-full"
                onClick={() => setScoresOpen(true)}
              >
                🏆 Punkteauswertung
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={handleResume}
              >
                Weiterspielen
              </Button>
            </div>
          )}
        />

        <HistoryTable
          game={game}
          activeRound={viewRoundIndex}
          onSelectRound={jumpToRound}
          revealed={scoresRevealed}
        />
      </div>

      <TargetReachedDialog
        open={targetPromptOpen}
        onOpenChange={setTargetPromptOpen}
        targetScore={game.targetScore}
        overName={worst?.name ?? ""}
        overScore={worst?.score ?? 0}
        leaderName={leader?.name ?? ""}
        leaderScore={leader?.score ?? 0}
        onShowScores={handleShowScores}
        onContinue={handleContinue}
      />

      <ScoreDialog
        open={scoresOpen}
        onOpenChange={setScoresOpen}
        players={scoringPlayers}
        shareConfig={shareConfigFor(game)}
        subtitle={
          <>
            🎯 Ziel: &lt; {game.targetScore + 1} Punkte · {game.rounds.length}{" "}
            {game.rounds.length === 1 ? "Runde" : "Runden"}
            {typeof elapsedMs === "number" && ` · ⏱ ${formatDuration(elapsedMs)}`}
          </>
        }
      />
    </>
  );
}
