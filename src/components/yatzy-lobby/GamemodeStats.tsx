"use client";

import { Info } from "lucide-react";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { useMatchHistory } from "@/components/hooks/useMatchHistory";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

type GamemodeStatsProps = {
  gamemode: keyof typeof gamemodes;
};

export function GamemodeStats({ gamemode }: GamemodeStatsProps) {
  const history = useMatchHistory();
  const matches = history.filter((match) => match.gamemode === gamemode);

  const gamesPlayed = matches.length;
  let highscore: { name: string; score: number } | null = null;
  const wins = new Map<string, number>();
  const played = new Map<string, number>();
  const expectedWins = new Map<string, number>();

  for (const match of matches) {
    if (match.players.length === 0) continue;

    for (const player of match.players) {
      if (!highscore || player.score > highscore.score) {
        highscore = { name: player.name, score: player.score };
      }
    }

    // Solo-Partien haben keinen echten Sieger und zählen nicht fürs Ranking.
    if (match.players.length < 2) continue;

    const winner = [...match.players].sort((a, b) => b.score - a.score)[0];
    wins.set(winner.name, (wins.get(winner.name) ?? 0) + 1);

    // Erwartete Siege aus reinem Zufall: 1 / Spieleranzahl dieser Partie.
    const share = 1 / match.players.length;
    for (const player of match.players) {
      played.set(player.name, (played.get(player.name) ?? 0) + 1);
      expectedWins.set(
        player.name,
        (expectedWins.get(player.name) ?? 0) + share,
      );
    }
  }

  const durations = matches
    .map((match) => match.durationMs)
    .filter((duration): duration is number => typeof duration === "number");
  const averageDurationMs =
    durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) /
        durations.length
      : null;

  const adjustedWinRate = (wins: number, games: number, m: number, C = 5) => {
    // m = Baseline-Gewinnquote (Ø 1 / Spieleranzahl der eigenen Partien)
    // C = wie stark der Prior zieht (in "Spielen")
    return (wins + C * m) / (games + C);
  };

  const topWinners = [...played.entries()]
    .map(([name, gamesPlayedByPlayer]) => {
      const playerWins = wins.get(name) ?? 0;
      const baseline = (expectedWins.get(name) ?? 0) / gamesPlayedByPlayer;
      return {
        name,
        gamesPlayedByPlayer,
        wins: playerWins,
        winRate: adjustedWinRate(playerWins, gamesPlayedByPlayer, baseline),
      };
    })
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Statistiken
      </h2>
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-4">
        {gamesPlayed === 0 || !highscore ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Spiele in diesem Modus.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Gespielte Spiele
                </p>
                <p className="text-xl font-bold">{gamesPlayed}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Highscore
                </p>
                <p className="text-xl font-bold text-brand-accent">
                  {highscore.score} · {highscore.name}
                </p>
              </div>
              {averageDurationMs !== null && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Ø Spielzeit
                  </p>
                  <p className="text-xl font-bold">
                    {formatDuration(averageDurationMs)}
                  </p>
                </div>
              )}
            </div>

            {topWinners.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Ranking
                  </p>
                  <Dialog>
                    <DialogTrigger
                      aria-label="Erklärung zur Siegquote"
                      className="text-muted-foreground"
                    >
                      <Info className="size-3.5" />
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Wie wird die Quote berechnet?</DialogTitle>
                      </DialogHeader>
                      <DialogDescription>
                        Nicht einfach Siege ÷ Spiele – sonst stünde jeder, der
                        genau ein Spiel gewonnen hat, mit 100 % ganz oben.
                      </DialogDescription>
                      <div className="flex flex-col gap-4 text-sm">
                        <p>
                          Stattdessen startet jeder mit 5 gedachten
                          Extra-Spielen, in denen er genau so oft gewinnt, wie
                          es der Zufall erwarten lässt: bei 4 Spielern also 25 %
                          davon, bei 2 Spielern 50 %.
                        </p>
                        <p>
                          Wer wenig gespielt hat, liegt dadurch nah an diesem
                          Erwartungswert. Je mehr Partien dazukommen, desto mehr
                          zählt die echte Bilanz – die gedachten Spiele fallen
                          kaum noch ins Gewicht.
                        </p>
                        <p className="text-muted-foreground">
                          Solo-Partien zählen nicht mit, da es dort keinen
                          Gegner zu schlagen gibt.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {topWinners.map(({ name, wins, gamesPlayedByPlayer, winRate }, index) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="font-bold">
                      {MEDALS[index]} {name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {wins} {wins === 1 ? "Sieg" : "Siege"} /{" "}
                      {gamesPlayedByPlayer}{" "}
                      {gamesPlayedByPlayer === 1 ? "Spiel" : "Spiele"},{" "}
                      {winRate.toLocaleString(undefined, {
                        style: "percent",
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
