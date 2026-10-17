"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScoreKeypad } from "./ScoreKeypad";
import { flip7Rules } from "../gamemodes";
import {
  FLIP7_BONUS,
  isFlip7Penalised,
  isRoundComplete,
  playerRoundScore,
  roundTotal,
  scoreAfterRound,
} from "../scoring";
import { Flip7Game } from "../types";

interface RoundCardProps {
  game: Flip7Game;
  roundIndex: number;
  onSetEntry: (
    playerId: string,
    value: number | null,
    flip7: boolean,
    flip7PenaltyOn: string | null,
  ) => void;
  onSetBusted: (playerId: string, busted: boolean) => void;
  /** Round done and nobody at the target yet — move on to the next one. */
  onAdvance: () => void;
  /** Round done and someone reached the target — ask how to continue. */
  onTargetReached: () => void;
  /** Shown instead of the actions once the partie has been declared over. */
  renderFinishedAction: () => React.ReactNode;
}

export function RoundCard({
  game,
  roundIndex,
  onSetEntry,
  onSetBusted,
  onAdvance,
  onTargetReached,
  renderFinishedAction,
}: RoundCardProps) {
  const [keypadPlayerId, setKeypadPlayerId] = useState<string | null>(null);

  const round = game.rounds[roundIndex];
  if (!round || game.players.length === 0) return null;

  const rules = flip7Rules(game.gamemode);
  const complete = isRoundComplete(round, game.players);
  const finished = game.finishedAt != null;
  const keypadPlayer = game.players.find((p) => p.id === keypadPlayerId);
  const keypadEntry = keypadPlayer ? round.entries[keypadPlayer.id] : undefined;
  const keypadBusted = rules.allowsNegative && keypadEntry?.busted === true;

  // The prompt keys off the standings after this round, so browsing back to an
  // older round can't trigger an end-of-game question for a later one.
  const reachesTarget = game.players.some(
    (p) => scoreAfterRound(game, p.id, roundIndex) >= game.targetScore,
  );

  return (
    <Card className="p-4 mx-4 mb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Runde {roundIndex + 1}</h2>
        <span className="text-sm text-muted-foreground">
          Ziel {game.targetScore} Punkte
        </span>
      </div>

      {/* One column per player on a phone; wider screens get more columns so a
          name never drifts a tablet's width away from its own score field. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {game.players.map((player) => {
          const entry = round.entries[player.id];
          const score = playerRoundScore(round, player.id, game.gamemode);
          const busted = entry?.busted === true;
          const flip7 = entry?.flip7 === true;
          const absent = entry?.absent === true;
          // Mega-Fies: Maluskarten still count against a busted player, so
          // their score field stays open instead of being locked at 0.
          const locked = absent || (busted && !rules.allowsNegative);
          const penalised =
            rules.allowsFlip7Penalty && isFlip7Penalised(round, player.id);
          const gaveAwayBonus = flip7 && entry?.flip7PenaltyOn != null;

          return (
            <div
              key={player.id}
              className={cn(
                "flex flex-col gap-2 rounded-xl bg-white px-3 py-2 dark:bg-[#212121]",
                absent && "opacity-50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {player.emoji ? `${player.emoji} ` : ""}
                  {player.name}
                </span>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setKeypadPlayerId(player.id)}
                  aria-label={`Punkte von ${player.name} eingeben`}
                  className={cn(
                    // Border present in every state — only the empty one shows
                    // it, but dropping it entirely would resize the button.
                    "min-w-16 rounded-full border px-4 py-2 text-lg font-bold tabular-nums",
                    // A bust keeps the muted look even where it stays tappable:
                    // its Maluspunkte are optional, not a missing answer.
                    locked || busted
                      ? "border-transparent bg-secondary text-muted-foreground"
                      : entry?.points != null
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-dashed border-border bg-card text-muted-foreground",
                  )}
                >
                  {absent ? "–" : busted ? (entry?.points ?? 0) : (entry?.points ?? "–")}
                </button>
              </div>

              {absent ? (
                <p className="text-xs text-muted-foreground">
                  War in dieser Runde noch nicht dabei.
                </p>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-pressed={busted}
                    onClick={() => onSetBusted(player.id, !busted)}
                    className={cn(
                      // The border stays in both states — dropping it would
                      // shrink the chip by 2px and shift the row on every tap.
                      "rounded-full border px-3 py-1 text-xs font-bold",
                      busted
                        ? "border-destructive bg-destructive text-white"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    💥 Verzockt
                  </button>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      busted || (score != null && score < 0)
                        ? "text-red-700 dark:text-red-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {score == null
                      ? "–"
                      : gaveAwayBonus
                        ? `7️⃣ ${score} · ${FLIP7_BONUS} verschenkt`
                        : penalised
                          ? `${score} · 7️⃣ −${FLIP7_BONUS}`
                          : flip7
                            ? `7️⃣ ${entry?.points ?? 0} + ${FLIP7_BONUS} = ${score}`
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
          {roundTotal(round, game.players, game.gamemode)} Punkte
        </span>
      </div>

      {finished ? (
        renderFinishedAction()
      ) : (
        <Button
          type="button"
          className="rounded-full"
          disabled={!complete}
          onClick={reachesTarget ? onTargetReached : onAdvance}
        >
          {complete && reachesTarget ? "🏁 Ziel erreicht" : "Runde abschließen"}
        </Button>
      )}

      <ScoreKeypad
        open={keypadPlayer != null}
        onOpenChange={(open) => !open && setKeypadPlayerId(null)}
        title={keypadPlayer ? `${keypadPlayer.name} – Runde ${roundIndex + 1}` : ""}
        description={
          keypadBusted
            ? "Verzockt: Nur noch die Maluskarten zählen — als Minuspunkte eintragen."
            : rules.allowsNegative
              ? "Summe der Zahlenkarten, Maluskarten schon abgezogen. Die 15 Extrapunkte für einen Flip 7 rechnet die App dazu."
              : "Summe der Zahlen- und Bonuskarten. Die 15 Extrapunkte für einen Flip 7 rechnet die App dazu."
        }
        value={keypadEntry?.points ?? null}
        flip7={keypadEntry?.flip7 === true}
        flip7PenaltyOn={keypadEntry?.flip7PenaltyOn ?? null}
        allowNegative={rules.allowsNegative}
        busted={keypadBusted}
        penaltyTargets={
          rules.allowsFlip7Penalty
            ? game.players.filter(
                (p) =>
                  p.id !== keypadPlayer?.id &&
                  round.entries[p.id]?.absent !== true,
              )
            : undefined
        }
        onSubmit={(value, flip7, flip7PenaltyOn) => {
          if (keypadPlayer)
            onSetEntry(keypadPlayer.id, value, flip7, flip7PenaltyOn);
        }}
      />
    </Card>
  );
}
