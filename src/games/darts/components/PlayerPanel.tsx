"use client";

import { cn } from "@/lib/utils";
import { IN_RULE_LABELS } from "../gamemodes";
import {
  DARTS_PER_TURN,
  LegState,
  PlayerStats,
  dartLabel,
} from "../scoring";
import { DartsGame } from "../types";

const formatAverage = (value: number) =>
  value.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * The scoreboard: one card per player, the person at the oche expanded.
 *
 * On wide screens this is the left-hand column next to the board; on a phone
 * it stacks above the keypad, which is why the card itself stays responsive
 * rather than coming in two variants.
 */
export function PlayerPanel({
  game,
  state,
  stats,
}: {
  game: DartsGame;
  state: LegState;
  stats: Record<string, PlayerStats>;
}) {
  const openTurn =
    state.openTurnIndex !== null ? state.turns[state.openTurnIndex] : undefined;
  // The visit just finished — a bust or a checkout stays on screen until the
  // next player throws, so nobody has to ask what happened.
  const lastTurn = state.turns[state.turns.length - 1];
  const flash = lastTurn?.complete ? lastTurn : undefined;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      {game.players.map((player) => {
        const active = state.currentPlayerId === player.id;
        const playerStats = stats[player.id];
        const remaining = state.remaining[player.id] ?? game.startScore;
        const opened = state.opened[player.id] ?? true;
        const previous = [...state.turns]
          .reverse()
          .find((turn) => turn.playerId === player.id && turn.complete);
        const busted = flash?.playerId === player.id && flash.busted;
        const won = state.winnerId === player.id;

        return (
          <div
            key={player.id}
            className={cn(
              // A border rather than a ring: a ring is painted outside the
              // box, which would make the active card wider than the rest.
              // The border is always there, only its colour changes.
              "flex flex-col gap-1 rounded-2xl border-2 bg-card p-3",
              active ? "border-brand-accent" : "border-transparent",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-bold">
                {player.emoji ? `${player.emoji} ` : ""}
                {player.name}
              </span>
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-accent-foreground tabular-nums">
                🏆 {playerStats?.legsWon ?? 0}/{game.legsToWin}
              </span>
            </div>

            <div className="flex items-end justify-between gap-2">
              <span
                className={cn(
                  "text-4xl font-extrabold leading-none tabular-nums",
                  won && "text-brand-accent",
                )}
              >
                {remaining}
              </span>
              <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                ø {formatAverage(playerStats?.average ?? 0)}
              </span>
            </div>

            {active && !won ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: DARTS_PER_TURN }, (_, index) => {
                    const thrown = openTurn?.darts[index];
                    return (
                      <span
                        key={index}
                        className={cn(
                          "min-w-10 rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums",
                          thrown
                            ? "bg-primary text-primary-foreground"
                            : "border border-dashed border-border text-muted-foreground",
                        )}
                      >
                        {thrown ? dartLabel(thrown) : "–"}
                      </span>
                    );
                  })}
                </div>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">
                  {openTurn ? `+${openTurn.score}` : "am Wurf"}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
                <span className="truncate">
                  {previous
                    ? previous.darts.map(dartLabel).join(" · ")
                    : "noch nichts geworfen"}
                </span>
                <span className="tabular-nums">
                  {previous ? `+${previous.score}` : ""}
                </span>
              </div>
            )}

            {!opened && (
              <p className="text-xs font-semibold text-brand-accent">
                muss erst mit {IN_RULE_LABELS[game.inRule]} eröffnen
              </p>
            )}
            {busted && (
              <p className="text-xs font-bold text-red-700 dark:text-red-400">
                💥 Überworfen — Rest bleibt bei {remaining}
              </p>
            )}
            {won && (
              <p className="text-xs font-bold text-brand-accent">
                ✓ Leg gewonnen mit {state.winnerDarts} Darts
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
