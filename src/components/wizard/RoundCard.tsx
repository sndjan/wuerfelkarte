"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberSelect } from "./NumberSelect";
import {
  allBidsEntered,
  allTricksEntered,
  bidSum,
  biddingOrder,
  cardsInRound,
  dealerIndex,
  roundScore,
  trickSum,
} from "./scoring";
import { WizardGame, WizardPhase } from "./types";

interface RoundCardProps {
  game: WizardGame;
  roundIndex: number;
  phase: WizardPhase;
  onPhaseChange: (phase: WizardPhase) => void;
  onSetBid: (playerId: string, value: number | null) => void;
  onSetTricks: (playerId: string, value: number | null) => void;
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
  onAdvance,
  renderFinalAction,
}: RoundCardProps) {
  const round = game.rounds[roundIndex];
  if (!round || game.players.length === 0) return null;

  const cards = cardsInRound(roundIndex);
  const order = biddingOrder(game, roundIndex);
  const dealer = game.players[dealerIndex(game, roundIndex)];
  const isLastRound = roundIndex === game.totalRounds - 1;

  const bidsComplete = allBidsEntered(round, game.players);
  const tricksComplete = allTricksEntered(round, game.players);
  const enteredSum = phase === "bids" ? bidSum(round) : trickSum(round);
  const phaseComplete = phase === "bids" ? bidsComplete : tricksComplete;

  const plusMinusWarning =
    phase === "bids" &&
    game.plusMinusOne &&
    bidsComplete &&
    bidSum(round) === cards;

  const trickSumWarning =
    phase === "tricks" && tricksComplete && trickSum(round) !== cards;

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
          const score = roundScore(bid, tricks);
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
                  max={cards}
                  label="–"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-sm text-muted-foreground">
          Summe: {enteredSum} / {cards}
        </div>
        {plusMinusWarning && (
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ Die Summe der Vorhersagen entspricht der Rundenzahl — bei
            Plus/Minus Eins nicht erlaubt.
          </div>
        )}
        {trickSumWarning && (
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ Die Stichsumme ({trickSum(round)}) entspricht nicht der
            Rundenzahl ({cards}). Bitte prüfen.
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
