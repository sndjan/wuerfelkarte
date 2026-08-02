"use client";

import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  gamemodeFromSlug,
  gamemodeInformation,
  wizardGamemodes,
} from "@/components/wizard/gamemodes";
import { HistoryTable } from "@/components/wizard/HistoryTable";
import { useWizard } from "@/components/wizard/hooks/useWizard";
import { RoundCard } from "@/components/wizard/RoundCard";
import {
  allBidsEntered,
  firstOpenRound,
  isGameFinished,
  standings,
} from "@/components/wizard/scoring";
import { Scoring } from "@/components/wizard/Scoring";
import {
  loadHideScoresSetting,
  saveHideScoresSetting,
} from "@/components/wizard/storage";
import { WizardPhase } from "@/components/wizard/types";
import { WizardMenu } from "@/components/wizard/WizardMenu";

export default function WizardGamePage() {
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
  } = useWizard(gamemode);

  const [hideScores, setHideScores] = useState(() => loadHideScoresSetting());

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
  const isBrowsingPast = viewRoundIndex !== resumeRound;
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
              <Scoring
                players={scoringPlayers}
                gamemode={gamemode}
                plusMinusOne={game.plusMinusOne}
                elapsedMs={elapsedMs}
              >
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
              </Scoring>
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
            <WizardMenu
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
          <span className="text-sm text-muted-foreground">
            Aktuelle Runde
          </span>
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
            <Scoring
              players={scoringPlayers}
              gamemode={gamemode}
              plusMinusOne={game.plusMinusOne}
              elapsedMs={elapsedMs}
            >
              <Button type="button" className="rounded-full" disabled={disabled}>
                🏆 Punkteauswertung
              </Button>
            </Scoring>
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
