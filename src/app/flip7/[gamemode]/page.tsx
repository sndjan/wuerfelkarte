"use client";

import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Flip7Menu } from "@/components/flip7/Flip7Menu";
import {
  flip7Gamemodes,
  gamemodeFromSlug,
  gamemodeInformation,
} from "@/components/flip7/gamemodes";
import { HistoryTable } from "@/components/flip7/HistoryTable";
import { useFlip7 } from "@/components/flip7/hooks/useFlip7";
import { RoundCard } from "@/components/flip7/RoundCard";
import {
  firstOpenRound,
  isTiedAtTop,
  standings,
} from "@/components/flip7/scoring";
import { Scoring } from "@/components/flip7/Scoring";
import {
  loadHideScoresSetting,
  saveHideScoresSetting,
} from "@/components/flip7/storage";
import { TargetReachedDialog } from "@/components/flip7/TargetReachedDialog";

export default function Flip7GamePage() {
  const params = useParams();
  const router = useRouter();
  const gamemode = gamemodeFromSlug((params.gamemode as string) || "");
  const config = flip7Gamemodes[gamemode];

  const {
    game,
    setEntry,
    setBusted,
    addRound,
    finishGame,
    resumeGame,
    setTargetScore,
    addPlayer,
    removePlayer,
    changeName,
    resetAll,
    resetRounds,
  } = useFlip7(gamemode);

  const [hideScores, setHideScores] = useState(() => loadHideScoresSetting());
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
  const isBrowsingPast = viewRoundIndex !== resumeRound;
  const finished = game.finishedAt != null;
  const scoresRevealed = !hideScores || finished;

  const scoringPlayers = useMemo(() => standings(game), [game]);
  const leader = scoringPlayers[0];
  const tied = isTiedAtTop(game);

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
    router.push("/flip7");
  };

  if (game.players.length === 0) {
    return (
      <>
        <PageHeader backHref="/flip7" title={config.name} />
        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
          <p className="text-muted-foreground">
            Es sind noch keine Spieler in diesem Spiel.
          </p>
          <Link
            href="/flip7"
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
        backHref="/flip7"
        title="Flip 7"
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
            <Flip7Menu
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
            />
          </>
        }
      />

      <div className="flex items-center justify-between px-4 mb-2">
        <button
          type="button"
          aria-label="Vorherige Runde"
          disabled={viewRoundIndex === 0}
          onClick={() => jumpToRound(viewRoundIndex - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        {isBrowsingPast ? (
          <button
            type="button"
            className="text-sm font-bold text-brand-accent underline"
            onClick={() => jumpToRound(resumeRound)}
          >
            Zur aktuellen Runde ({resumeRound + 1})
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">Aktuelle Runde</span>
        )}
        <button
          type="button"
          aria-label="Nächste Runde"
          disabled={viewRoundIndex >= game.rounds.length - 1}
          onClick={() => jumpToRound(viewRoundIndex + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="pb-8">
        <RoundCard
          game={game}
          roundIndex={viewRoundIndex}
          onSetEntry={(playerId, value, flip7) =>
            setEntry(viewRoundIndex, playerId, value, flip7)
          }
          onSetBusted={(playerId, busted) =>
            setBusted(viewRoundIndex, playerId, busted)
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
        leaderName={leader?.name ?? ""}
        leaderScore={leader?.score ?? 0}
        tied={tied}
        onShowScores={handleShowScores}
        onContinue={handleContinue}
      />

      <Scoring
        open={scoresOpen}
        onOpenChange={setScoresOpen}
        players={scoringPlayers}
        gamemode={gamemode}
        targetScore={game.targetScore}
        rounds={game.rounds.length}
        elapsedMs={elapsedMs}
      />
    </>
  );
}
