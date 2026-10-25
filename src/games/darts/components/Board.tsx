"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import ThemeManager from "@/components/common/seasonal/ThemeManager";
import { useSeasonalTheme } from "@/components/common/seasonal/useSeasonalTheme";
import { Button } from "@/components/ui/button";
import { ScoreDialog } from "@/games/shared/components/ScoreDialog";
import { formatDuration } from "@/lib/utils";
import { checkoutRoute } from "../checkout";
import { shareConfigFor } from "../config";
import {
  dartsGamemodes,
  gamemodeFromSlug,
  gamemodeInformation,
  rulesLabel,
} from "../gamemodes";
import { useGame } from "../hooks/useGame";
import {
  currentLegIndex,
  currentLegState,
  hasAnyDart,
  playerStats,
  standings,
} from "../scoring";
import { loadInputModeSetting, saveInputModeSetting } from "../storage";
import { Dartboard } from "./Dartboard";
import { DartKeypad } from "./DartKeypad";
import { LegWonDialog } from "./LegWonDialog";
import { MaximumBanner, MaximumShout } from "./MaximumBanner";
import { Menu } from "./Menu";
import { OcheControls } from "./Oche";
import { PlayerPanel } from "./PlayerPanel";

export function Board() {
  const params = useParams();
  const router = useRouter();
  const gamemode = gamemodeFromSlug((params.gamemode as string) || "");
  const config = dartsGamemodes[gamemode];

  const {
    game,
    throwDart,
    undoLastDart,
    startNextLeg,
    setLegsToWin,
    addPlayer,
    removePlayer,
    changeName,
    resetAll,
    resetLegs,
  } = useGame(gamemode);

  const { theme, isThemeActive, setIsThemeActive } = useSeasonalTheme();
  const [scoresOpen, setScoresOpen] = useState(false);
  const [legDialogOpen, setLegDialogOpen] = useState(false);
  const [announcedLeg, setAnnouncedLeg] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"board" | "keypad">(() =>
    loadInputModeSetting(),
  );
  const state = useMemo(() => currentLegState(game), [game]);
  const stats = useMemo(
    () =>
      Object.fromEntries(
        game.players.map((player) => [player.id, playerStats(game, player.id)]),
      ),
    [game],
  );

  const finished = game.finishedAt != null;
  const legDecided = state.winnerId != null;
  const legIndex = currentLegIndex(game);
  const winner = game.players.find((p) => p.id === state.winnerId);
  const legDarts = state.turns.reduce(
    (sum, turn) => sum + turn.darts.length,
    0,
  );
  const visitStart = legDarts - (state.turns.at(-1)?.darts.length ?? 0);

  // A leg that has just been decided is announced exactly once — reopening it
  // after a dismissal is the board's job, not the dialog's.
  const decidedKey = legDecided ? `${legIndex}:${state.winnerId}` : null;
  useEffect(() => {
    if (decidedKey == null) {
      // Undoing the winning dart puts the leg back in play: the announcement
      // goes with it, so finishing the leg again announces it again.
      setAnnouncedLeg(null);
      setLegDialogOpen(false);
      return;
    }
    if (decidedKey === announcedLeg) return;
    setAnnouncedLeg(decidedKey);
    setLegDialogOpen(true);
  }, [decidedKey, announcedLeg]);

  // A visit of 180 is announced when someone's maximum count goes up, so an
  // undone and re-thrown 180 shouts again but reopening the page does not.
  const [maximum, setMaximum] = useState<MaximumShout | null>(null);
  const seenMaximums = useRef<Record<string, number> | null>(null);
  useEffect(() => {
    const counts = Object.fromEntries(
      game.players.map((p) => [p.id, stats[p.id]?.maximums ?? 0]),
    );
    const seen = seenMaximums.current;
    seenMaximums.current = counts;
    if (!seen) return;
    const thrower = game.players.find((p) => counts[p.id] > (seen[p.id] ?? 0));
    if (thrower) {
      setMaximum({ key: Date.now(), name: thrower.name, emoji: thrower.emoji });
    }
  }, [game.players, stats]);
  const dismissMaximum = useCallback(() => setMaximum(null), []);

  const toggleInputMode = () =>
    setInputMode((prev) => {
      const next = prev === "board" ? "keypad" : "board";
      saveInputModeSetting(next);
      return next;
    });

  const scoringPlayers = useMemo(() => standings(game), [game]);
  const tally = scoringPlayers.map((player) => ({
    name: player.name,
    emoji: player.emoji,
    legs: player.score,
  }));

  const elapsedMs =
    game.startedAt != null && game.finishedAt != null
      ? game.finishedAt - game.startedAt
      : null;

  const handleContinue = () => {
    setLegDialogOpen(false);
    startNextLeg();
  };

  const handleShowScores = () => {
    setLegDialogOpen(false);
    setScoresOpen(true);
  };

  const handleRematch = () => {
    setLegDialogOpen(false);
    setAnnouncedLeg(null);
    resetLegs();
  };

  const handleResetAll = () => {
    resetAll();
    router.push("/darts");
  };

  if (game.players.length === 0) {
    return (
      <>
        <PageHeader backHref="/darts" title={config.name} />
        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
          <p className="text-muted-foreground">
            Es sind noch keine Spieler in diesem Spiel.
          </p>
          <Link
            href="/darts"
            className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"
          >
            Zurück zur Lobby
          </Link>
        </div>
      </>
    );
  }

  return (
    // Wide screens lay the game out inside the viewport: the page itself does
    // not scroll, only the player column does when the table gets crowded.
    <div className="lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
      <PageHeader
        backHref="/darts"
        title="Darts"
        right={
          <>
            <Button
              variant="outline"
              onClick={() => setScoresOpen(true)}
              className={
                finished
                  ? "rounded-full bg-yellow-400 hover:bg-gray-500 dark:bg-yellow-400 dark:text-black"
                  : "rounded-full bg-white"
              }
            >
              🏆
              <span className="hidden sm:block">Punkteauswertung</span>
            </Button>
            <Menu
              game={game}
              gamemodeInfo={gamemodeInformation(gamemode, game)}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onRenamePlayer={changeName}
              onSetLegsToWin={setLegsToWin}
              onResetLegs={resetLegs}
              onResetAll={handleResetAll}
              seasonalTheme={theme}
              isThemeActive={isThemeActive}
              onToggleTheme={() => setIsThemeActive?.(!isThemeActive)}
            />
          </>
        }
      />

      <div className="flex items-center justify-between gap-2 px-4 pb-3 text-sm text-muted-foreground lg:shrink-0">
        <span className="font-semibold">
          Leg {legIndex + 1} · {rulesLabel(game)}
        </span>
      </div>

      <div className="relative isolate overflow-clip pb-8 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:pb-4">
        <ThemeManager theme={theme} isThemeActive={isThemeActive ?? false} />

        <div className="flex flex-col gap-4 px-4 lg:min-h-0 lg:flex-1 lg:flex-row">
          {/* The only part that may scroll: a long table of players. */}
          <div className="flex flex-col gap-3 lg:w-80 lg:min-h-0 lg:shrink-0 lg:overflow-y-auto xl:w-96">
            <PlayerPanel game={game} state={state} stats={stats} />
          </div>

          {/* Wide screens put the controls beside the board instead of above
              it, so the board keeps the full height of the column. */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0 lg:flex-row-reverse">
            <OcheControls
              canUndo={hasAnyDart(game)}
              onUndo={undoLastDart}
              inputMode={inputMode}
              onToggleInputMode={toggleInputMode}
            />

            {legDecided || finished ? (
              <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 lg:flex-1 lg:self-start">
                <p className="font-bold">
                  {finished
                    ? `🏆 ${winner?.name ?? scoringPlayers[0]?.name} gewinnt die Partie`
                    : `Leg ${legIndex + 1} an ${winner?.name ?? ""}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {finished
                    ? "Die Partie ist entschieden — Revanche oder Auswertung?"
                    : `Gewonnen mit ${state.winnerDarts} Darts.`}
                </p>
                {finished ? (
                  <>
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
                      onClick={handleRematch}
                    >
                      Revanche
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    className="rounded-full"
                    onClick={handleContinue}
                  >
                    Nächstes Leg
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* A phone never gets the board, so the keypad is always there;
                    on a wide screen it only shows when it was chosen. */}
                <div
                  className={inputMode === "board" ? "lg:hidden" : undefined}
                >
                  <DartKeypad onThrow={throwDart} />
                </div>
                {inputMode === "board" && (
                  <div className="hidden justify-center lg:flex lg:min-h-0 lg:min-w-0 lg:flex-1">
                    <Dartboard
                      key={legIndex}
                      onThrow={throwDart}
                      thrown={legDarts}
                      visitStart={visitStart}
                      highlight={
                        state.currentPlayerId
                          ? (checkoutRoute(
                              state.remaining[state.currentPlayerId] ??
                                game.startScore,
                              state.dartsLeftInTurn,
                              game.outRule,
                            ) ?? [])
                          : []
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <MaximumBanner shout={maximum} onDone={dismissMaximum} />

      <LegWonDialog
        open={legDialogOpen}
        onOpenChange={setLegDialogOpen}
        legNumber={legIndex + 1}
        winnerName={winner?.name ?? ""}
        winnerDarts={state.winnerDarts}
        tally={tally}
        matchDecided={finished}
        onContinue={handleContinue}
        onShowScores={handleShowScores}
        onRematch={handleRematch}
      />

      <ScoreDialog
        open={scoresOpen}
        onOpenChange={setScoresOpen}
        players={scoringPlayers}
        shareConfig={shareConfigFor(game)}
        subtitle={
          <>
            🎯 {rulesLabel(game)} · {game.legs.length}{" "}
            {game.legs.length === 1 ? "Leg" : "Legs"}
            {typeof elapsedMs === "number" &&
              ` · ⏱ ${formatDuration(elapsedMs)}`}
          </>
        }
      />
    </div>
  );
}
