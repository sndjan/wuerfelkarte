"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScoreKeypad } from "./ScoreKeypad";
import {
  CABO_MISS_PENALTY,
  computeRoundScores,
  isRoundComplete,
  roundTotal,
  scoreAfterRound,
} from "../scoring";
import { CaboGame } from "../types";

interface RoundCardProps {
  game: CaboGame;
  roundIndex: number;
  onSetCardSum: (playerId: string, value: number | null) => void;
  onSetCalledCabo: (playerId: string, called: boolean) => void;
  onSetSpecialHand: (playerId: string, special: boolean) => void;
  /** Round done and nobody past the target yet — move on to the next one. */
  onAdvance: () => void;
  /** Round done and someone passed the target — ask how to continue. */
  onTargetReached: () => void;
  /** Shown instead of the actions once the partie has been declared over. */
  renderFinishedAction: () => React.ReactNode;
}

export function RoundCard({
  game,
  roundIndex,
  onSetCardSum,
  onSetCalledCabo,
  onSetSpecialHand,
  onAdvance,
  onTargetReached,
  renderFinishedAction,
}: RoundCardProps) {
  const [keypadPlayerId, setKeypadPlayerId] = useState<string | null>(null);

  const round = game.rounds[roundIndex];
  if (!round || game.players.length === 0) return null;

  const complete = isRoundComplete(round, game.players);
  const finished = game.finishedAt != null;
  const keypadPlayer = game.players.find((p) => p.id === keypadPlayerId);
  const scores = computeRoundScores(round, game.players);

  // The prompt keys off the standings after this round, so browsing back to an
  // older round can't trigger an end-of-game question for a later one.
  const passesTarget = game.players.some(
    (p) => scoreAfterRound(game, p.id, roundIndex) > game.targetScore,
  );

  return (
    <Card className="p-4 mx-4 mb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Runde {roundIndex + 1}</h2>
        <span className="text-sm text-muted-foreground">
          Ziel &lt; {game.targetScore + 1} Punkte
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {game.players.map((player) => {
          const entry = round.entries[player.id];
          const score = scores[player.id];
          const specialHand = entry?.specialHand === true;
          const calledCabo = entry?.calledCabo === true;
          const absent = entry?.absent === true;
          const missedLowest = calledCabo && score != null && score !== 0;

          return (
            <div
              key={player.id}
              className={cn(
                "flex flex-col gap-2 rounded-xl bg-white px-3 py-2 dark:bg-[#212121]",
                absent && "opacity-50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">
                  {player.emoji ? `${player.emoji} ` : ""}
                  {player.name}
                </span>
                <button
                  type="button"
                  disabled={specialHand || absent}
                  onClick={() => setKeypadPlayerId(player.id)}
                  aria-label={`Kartensumme von ${player.name} eingeben`}
                  className={cn(
                    // Border present in every state — only the empty one shows
                    // it, but dropping it entirely would resize the button.
                    "min-w-16 rounded-full border px-4 py-2 text-lg font-bold tabular-nums",
                    specialHand || absent
                      ? "border-transparent bg-secondary text-muted-foreground"
                      : entry?.cardSum != null
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-dashed border-border bg-card text-muted-foreground",
                  )}
                >
                  {absent ? "–" : (entry?.cardSum ?? "–")}
                </button>
              </div>

              {absent ? (
                <p className="text-xs text-muted-foreground">
                  War in dieser Runde noch nicht dabei.
                </p>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={calledCabo}
                      onClick={() => onSetCalledCabo(player.id, !calledCabo)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-bold",
                        calledCabo
                          ? "border-brand-accent bg-brand-accent text-white"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      🗣️ Cabo
                    </button>
                    <button
                      type="button"
                      aria-pressed={specialHand}
                      onClick={() => onSetSpecialHand(player.id, !specialHand)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-bold",
                        specialHand
                          ? "border-destructive bg-destructive text-white"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      👑 12-12-13-13
                    </button>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-bold tabular-nums",
                      score === 0
                        ? "text-green-700 dark:text-green-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {score == null
                      ? "–"
                      : missedLowest
                        ? `${entry?.cardSum} +${CABO_MISS_PENALTY} = ${score}`
                        : score}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Only this round's yield — the running standings stay hidden separately. */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Runde gesamt</span>
        <span className="font-bold tabular-nums">
          {roundTotal(round, game.players)} Punkte
        </span>
      </div>

      {finished ? (
        renderFinishedAction()
      ) : (
        <Button
          type="button"
          className="rounded-full"
          disabled={!complete}
          onClick={passesTarget ? onTargetReached : onAdvance}
        >
          {complete && passesTarget ? "🏁 Ziel überschritten" : "Runde abschließen"}
        </Button>
      )}

      <ScoreKeypad
        open={keypadPlayer != null}
        onOpenChange={(open) => !open && setKeypadPlayerId(null)}
        title={keypadPlayer ? `${keypadPlayer.name} – Runde ${roundIndex + 1}` : ""}
        value={
          keypadPlayer ? (round.entries[keypadPlayer.id]?.cardSum ?? null) : null
        }
        onSubmit={(value) => {
          if (keypadPlayer) onSetCardSum(keypadPlayer.id, value);
        }}
      />
    </Card>
  );
}
