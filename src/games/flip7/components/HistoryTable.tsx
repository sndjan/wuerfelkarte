"use client";

import { cn } from "@/lib/utils";
import { playerRoundScore, totalScore } from "../scoring";
import { Flip7Game } from "../types";

interface HistoryTableProps {
  game: Flip7Game;
  activeRound: number;
  onSelectRound: (roundIndex: number) => void;
  /** When false, the running total is masked until the game finishes. */
  revealed: boolean;
}

export function HistoryTable({
  game,
  activeRound,
  onSelectRound,
  revealed,
}: HistoryTableProps) {
  if (game.players.length === 0) return null;

  return (
    <div className="mx-4 mb-4 flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Verlauf
      </h2>
      <div className="overflow-x-auto rounded-2xl bg-card">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-bold text-muted-foreground">
                R
              </th>
              {game.players.map((player) => (
                <th
                  key={player.id}
                  className="px-3 py-2 text-left font-bold text-muted-foreground"
                  title={player.name}
                >
                  {player.emoji ? `${player.emoji} ` : ""}
                  {player.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.rounds.map((round, index) => (
              <tr
                key={index}
                onClick={() => onSelectRound(index)}
                className={cn(
                  "cursor-pointer border-b border-border last:border-0 hover:bg-accent/50",
                  index === activeRound && "bg-accent",
                )}
              >
                <td className="px-3 py-2 font-semibold">{index + 1}</td>
                {game.players.map((player) => {
                  const entry = round.entries[player.id];
                  const score = playerRoundScore(round, player.id);
                  return (
                    <td key={player.id} className="px-3 py-2 whitespace-nowrap">
                      {entry?.absent ? (
                        <span className="text-muted-foreground">–</span>
                      ) : entry?.busted ? (
                        <span className="font-semibold text-red-700 dark:text-red-400">
                          💥 0
                        </span>
                      ) : score == null ? (
                        <span className="text-muted-foreground">·</span>
                      ) : (
                        <span className="font-semibold">
                          {entry?.flip7 && "7️⃣ "}
                          {score}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-bold">
              <td className="px-3 py-2">Σ</td>
              {game.players.map((player) => (
                <td key={player.id} className="px-3 py-2">
                  {revealed ? totalScore(game, player.id) : "🔒"}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
