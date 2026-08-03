"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NumberSelect } from "./NumberSelect";
import {
  allBidsEntered,
  allTricksEntered,
  bidSum,
  biddingOrder,
  cardsInRound,
  dealerIndex,
  effectiveBid,
  hasSpecialCard,
  playerRoundScore,
  tricksInRound,
  trickSum,
  wolkeDeltaOptions,
} from "../scoring";
import { specialCardInfo } from "../specialCards";
import { WizardGame, WizardPhase, WizardWolke } from "../types";

interface RoundCardProps {
  game: WizardGame;
  roundIndex: number;
  phase: WizardPhase;
  onPhaseChange: (phase: WizardPhase) => void;
  onSetBid: (playerId: string, value: number | null) => void;
  onSetTricks: (playerId: string, value: number | null) => void;
  onSetBombTrick: (value: boolean) => void;
  onSetWolke: (wolke: WizardWolke | null) => void;
  onAdvance: () => void;
  /** Swapped in for "Runde abschließen" on the very last round's tricks phase. */
  renderFinalAction: (disabled: boolean) => React.ReactNode;
}

export function RoundCard({
  game,
  roundIndex,
  phase,
  onPhaseChange,
  onSetBid,
  onSetTricks,
  onSetBombTrick,
  onSetWolke,
  onAdvance,
  renderFinalAction,
}: RoundCardProps) {
  const round = game.rounds[roundIndex];
  if (!round || game.players.length === 0) return null;

  const cards = cardsInRound(roundIndex);
  const winnableTricks = tricksInRound(round, roundIndex);
  const order = biddingOrder(game, roundIndex);
  const dealer = game.players[dealerIndex(game, roundIndex)];
  const isLastRound = roundIndex === game.totalRounds - 1;

  const bombeInPlay = hasSpecialCard(game, "bombe");
  const wolkeInPlay = hasSpecialCard(game, "wolke");
  const bombe = specialCardInfo("bombe");
  const wolke = specialCardInfo("wolke");

  const bidsComplete = allBidsEntered(round, game.players);
  const tricksComplete = allTricksEntered(round, game.players);
  const enteredSum = phase === "bids" ? bidSum(round) : trickSum(round);
  const expectedSum = phase === "bids" ? cards : winnableTricks;
  const phaseComplete = phase === "bids" ? bidsComplete : tricksComplete;

  const plusMinusWarning =
    phase === "bids" &&
    game.plusMinusOne &&
    bidsComplete &&
    bidSum(round) === cards;

  const trickSumWarning =
    phase === "tricks" && tricksComplete && trickSum(round) !== winnableTricks;

  const wolkePlayer = round.wolke
    ? game.players.find((p) => p.id === round.wolke?.playerId)
    : undefined;
  const wolkeDeltas = round.wolke
    ? wolkeDeltaOptions(round, round.wolke.playerId, roundIndex)
    : [];

  const toggleWolkePlayer = (playerId: string) => {
    if (round.wolke?.playerId === playerId) {
      onSetWolke(null);
      return;
    }
    const [first] = wolkeDeltaOptions(round, playerId, roundIndex);
    onSetWolke({ playerId, delta: first ?? 1 });
  };

  return (
    <Card className="p-4 mx-4 mb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">
          Runde {roundIndex + 1} / {game.totalRounds}
        </h2>
        <span className="text-sm text-muted-foreground">
          {cards} {cards === 1 ? "Karte" : "Karten"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {phase === "bids" ? "Vorhersage" : "Stiche"}
        </h3>
        {order.map((player) => {
          const bid = round.bids[player.id] ?? null;
          const tricks = round.tricks[player.id] ?? null;
          const adjustedBid = effectiveBid(round, player.id);
          const shifted = bid != null && adjustedBid != null && adjustedBid !== bid;
          const score = playerRoundScore(round, player.id);
          return (
            <div
              key={player.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-[#212121] px-3 py-2"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="font-semibold truncate">
                  {player.emoji ? `${player.emoji} ` : ""}
                  {player.name}
                </span>
                {player.id === dealer?.id && (
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                    teilt aus
                  </span>
                )}
                {shifted && (
                  <span
                    className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                    title={`Wolke: Vorhersage ${bid} → ${adjustedBid}`}
                  >
                    {wolke.emoji} {bid} → {adjustedBid}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {phase === "tricks" && score !== null && (
                  <span
                    className={
                      score >= 0
                        ? "text-xs font-bold text-green-700 dark:text-green-400"
                        : "text-xs font-bold text-red-700 dark:text-red-400"
                    }
                  >
                    {score >= 0 ? `+${score}` : score}
                  </span>
                )}
                <NumberSelect
                  value={phase === "bids" ? bid : tricks}
                  onValueChange={(value) =>
                    phase === "bids"
                      ? onSetBid(player.id, value)
                      : onSetTricks(player.id, value)
                  }
                  max={phase === "bids" ? cards : winnableTricks}
                  label="–"
                />
              </div>
            </div>
          );
        })}
      </div>

      {phase === "tricks" && bombeInPlay && (
        <button
          type="button"
          role="switch"
          aria-checked={round.bombTrick === true}
          onClick={() => onSetBombTrick(round.bombTrick !== true)}
          className="flex items-center justify-between gap-4 rounded-xl bg-white dark:bg-[#212121] px-3 py-2 text-left"
        >
          <span>
            <span className="block text-sm font-semibold">
              {bombe.emoji} Bombenstich
            </span>
            <span className="block text-xs text-muted-foreground">
              Der Stich mit der Bombe gehört niemandem — es gibt einen Stich
              weniger zu verteilen.
            </span>
          </span>
          <span
            className={cn(
              "relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors",
              round.bombTrick ? "bg-primary" : "bg-input",
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                round.bombTrick ? "translate-x-6" : "translate-x-1",
              )}
            />
          </span>
        </button>
      )}

      {phase === "tricks" && wolkeInPlay && (
        <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-[#212121] px-3 py-2">
          <span className="text-sm font-semibold">
            {wolke.emoji} Wolke bei
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSetWolke(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                round.wolke
                  ? "border-border text-muted-foreground"
                  : "border-transparent bg-accent text-accent-foreground",
              )}
            >
              niemandem
            </button>
            {game.players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => toggleWolkePlayer(player.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-semibold",
                  round.wolke?.playerId === player.id
                    ? "border-transparent bg-brand-accent text-white"
                    : "border-border text-foreground",
                )}
              >
                {player.emoji ? `${player.emoji} ` : ""}
                {player.name}
              </button>
            ))}
          </div>
          {round.wolke && wolkePlayer && (
            <div className="flex flex-wrap items-center gap-2">
              {wolkeDeltas.map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() =>
                    onSetWolke({ playerId: wolkePlayer.id, delta })
                  }
                  className={cn(
                    "w-14 rounded-full border py-1 text-sm font-bold",
                    round.wolke?.delta === delta
                      ? "border-transparent bg-brand-accent text-white"
                      : "border-border text-foreground",
                  )}
                >
                  {delta > 0 ? "+1" : "−1"}
                </button>
              ))}
              <span className="text-xs text-muted-foreground">
                {wolkePlayer.name}: Vorhersage {round.bids[wolkePlayer.id] ?? "·"}{" "}
                → {effectiveBid(round, wolkePlayer.id) ?? "·"}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="text-sm text-muted-foreground">
          Summe: {enteredSum} / {expectedSum}
          {phase === "tricks" && round.bombTrick && (
            <span> ({cards} Karten − 1 Bombenstich)</span>
          )}
        </div>
        {plusMinusWarning && (
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ Die Summe der Vorhersagen entspricht der Rundenzahl — bei
            Plus/Minus Eins nicht erlaubt.
          </div>
        )}
        {trickSumWarning && (
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ Die Stichsumme ({trickSum(round)}) entspricht nicht der Anzahl der
            zu gewinnenden Stiche ({winnableTricks}). Bitte prüfen.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {phase === "tricks" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => onPhaseChange("bids")}
          >
            ← Vorhersage
          </Button>
        ) : (
          <span />
        )}
        {phase === "bids" ? (
          <Button
            type="button"
            className="rounded-full"
            disabled={!phaseComplete}
            onClick={() => onPhaseChange("tricks")}
          >
            Weiter zu Stichen →
          </Button>
        ) : isLastRound ? (
          renderFinalAction(!phaseComplete)
        ) : (
          <Button
            type="button"
            className="rounded-full"
            disabled={!phaseComplete}
            onClick={onAdvance}
          >
            Runde abschließen ✓
          </Button>
        )}
      </div>
    </Card>
  );
}
