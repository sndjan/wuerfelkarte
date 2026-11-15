"use client";

import { ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { useSelfPlayer } from "@/components/account/useSelfPlayer";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { caboStorage } from "@/games/cabo/storage";
import { dartsStorage } from "@/games/darts/storage";
import { flip7Storage } from "@/games/flip7/storage";
import { wizardStorage } from "@/games/wizard/storage";
import { yatzyStorage } from "@/games/yatzy/storage";
import { cn } from "@/lib/utils";
import { useMatchHistory } from "../hooks/useMatchHistory";
import { formatRate, headToHead, knownPlayers, playerSummary } from "../playerStats";
import type { MatchPlayer, StoredMatch } from "../types";

type StatGame = {
  key: string;
  name: string;
  emoji: string;
  load: () => StoredMatch<MatchPlayer>[];
  lowerIsBetter?: boolean;
};

const GAMES: StatGame[] = [
  { key: "yatzy", name: "Würfelkarte", emoji: "🎲", load: yatzyStorage.loadMatches as () => StoredMatch<MatchPlayer>[] },
  { key: "wizard", name: "Wizard", emoji: "🧙‍♂️", load: wizardStorage.loadMatches as () => StoredMatch<MatchPlayer>[] },
  { key: "flip7", name: "Flip 7", emoji: "7️⃣", load: flip7Storage.loadMatches as () => StoredMatch<MatchPlayer>[] },
  { key: "cabo", name: "Cabo", emoji: "🃏", load: caboStorage.loadMatches as () => StoredMatch<MatchPlayer>[], lowerIsBetter: true },
  { key: "darts", name: "Darts", emoji: "🎯", load: dartsStorage.loadMatches as () => StoredMatch<MatchPlayer>[] },
];

/** How often a player scored in the five-of-a-kind field (Würfelkarte only). */
function fiveOfAKind(name: string, matches: StoredMatch<MatchPlayer>[]): number {
  const lower = name.trim().toLowerCase();
  return matches.reduce((count, match) => {
    const me = match.players.find((p) => p.name.trim().toLowerCase() === lower) as
      | (MatchPlayer & { points?: Record<string, unknown> })
      | undefined;
    const value = me?.points?.Wunder;
    return count + (typeof value === "number" && value > 0 ? 1 : 0);
  }, 0);
}

function Statistics() {
  const params = useSearchParams();
  const game = GAMES.find((g) => g.key === params.get("spiel")) ?? GAMES[0];
  // Keyed by game: the history hook reads its storage once per mount.
  return <GameStatistics key={game.key} game={game} />;
}

function GameStatistics({ game }: { game: StatGame }) {
  const params = useSearchParams();
  const router = useRouter();
  const matches = useMatchHistory(game.load);
  const self = useSelfPlayer();

  // The user's own entry first, then everyone by games played.
  const players = useMemo(() => {
    const all = knownPlayers(matches);
    const mine = self ? all.findIndex((p) => p.name.trim().toLowerCase() === self.name.trim().toLowerCase()) : -1;
    return mine > 0 ? [all[mine], ...all.slice(0, mine), ...all.slice(mine + 1)] : all;
  }, [matches, self]);

  const [picked, setPicked] = useState<string | null>(params.get("spieler"));
  useEffect(() => setPicked(params.get("spieler")), [params]);
  const current =
    players.find((p) => p.name.trim().toLowerCase() === picked?.trim().toLowerCase()) ?? players[0] ?? null;

  const pickGame = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("spiel", key);
    router.replace(`/statistik?${next.toString()}`);
  };

  return (
    <div className="wk min-h-full bg-background">
      <PageHeader
        title="Statistik"
        right={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" aria-label={`Spiel wählen: ${game.name}`}>
                <span aria-hidden="true">{game.emoji}</span>
                {game.name}
                <ChevronDown className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {GAMES.map((g) => (
                <DropdownMenuItem key={g.key} onSelect={() => pickGame(g.key)}>
                  <span aria-hidden="true">{g.emoji}</span> {g.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-8 md:grid md:max-w-[1180px] md:grid-cols-[340px_minmax(0,1fr)] md:gap-8 md:px-8">
        {players.length === 0 || !current ? (
          <div className="wk-empty md:col-span-2">
            <strong>Noch keine Spiele</strong>
            Sobald ihr eine {game.name}-Partie beendet, stehen hier eure Zahlen.
          </div>
        ) : (
          <>
            <PlayerPicker players={players} current={current.name} onPick={setPicked} selfName={self?.name} />
            <PlayerNumbers
              name={current.name}
              players={players}
              matches={matches}
              game={game}
              onPick={setPicked}
            />
          </>
        )}
      </main>
    </div>
  );
}

/** Phone: a row of chips that scrolls sideways. iPad: a list with games and win rate. */
function PlayerPicker({
  players,
  current,
  onPick,
  selfName,
}: {
  players: ReturnType<typeof knownPlayers>;
  current: string;
  onPick: (name: string) => void;
  selfName?: string;
}) {
  return (
    <section className="wk-section">
      <h2 className="wk-overline hidden md:block">Spieler</h2>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-1.5 pb-1 md:hidden" role="group" aria-label="Spieler">
        {players.map((p) => (
          <button
            key={p.name}
            type="button"
            aria-pressed={p.name === current}
            className="wk-chip shrink-0"
            onClick={() => onPick(p.name)}
          >
            <span className="wk-chip-emoji" aria-hidden="true">
              {p.emoji ?? "🙂"}
            </span>
            {p.name}
          </button>
        ))}
      </div>
      <div className="hidden flex-col gap-2 md:flex">
        {players.map((p) => (
          <button
            key={p.name}
            type="button"
            aria-pressed={p.name === current}
            className={cn("wk-listrow py-3", p.name === current && "wk-card-accent")}
            onClick={() => onPick(p.name)}
          >
            <span className="wkx-avatar" aria-hidden="true">
              {p.emoji ?? "🙂"}
            </span>
            <span className="wk-listrow-body">
              <span className="wk-listrow-title block">
                {p.name}
                {selfName && p.name.trim().toLowerCase() === selfName.trim().toLowerCase() && " (du)"}
              </span>
              <span className="wk-listrow-sub block">
                {p.games} {p.games === 1 ? "Spiel" : "Spiele"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PlayerNumbers({
  name,
  players,
  matches,
  game,
  onPick,
}: {
  name: string;
  players: ReturnType<typeof knownPlayers>;
  matches: StoredMatch<MatchPlayer>[];
  game: StatGame;
  onPick: (name: string) => void;
}) {
  const lower = !!game.lowerIsBetter;
  const summary = playerSummary(name, matches, lower);
  const best = summary.recent.length === 0 ? null : lower ? Math.min(...summary.recent) : Math.max(...summary.recent);
  const top = Math.max(1, ...summary.recent);
  const others = players.filter((p) => p.name !== name).slice(0, 5);
  const duels = others
    .map((p) => ({ player: p, ...headToHead(name, p.name, matches, lower) }))
    .filter((d) => d.wins + d.losses > 0);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <section className="wk-section">
        <h2 className="wk-overline hidden md:block">{name} in Zahlen</h2>
        <div className="wk-stats gap-y-4 md:grid-cols-6 md:py-6">
          <Stat value={summary.games} label="Spiele" />
          <Stat value={summary.wins} label="Siege" />
          <Stat value={formatRate(summary)} label="Siegquote" />
          <Stat value={summary.highscore ?? "–"} label={lower ? "Bestwert" : "Highscore"} />
          <Stat value={summary.average ?? "–"} label="Ø Punkte" />
          {game.key === "yatzy" ? (
            <Stat value={fiveOfAKind(name, matches)} label="5er-Pasch" />
          ) : (
            <Stat value={duels.length} label="Gegner" />
          )}
        </div>
      </section>

      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-6">
        <section className="wk-section">
          <h2 className="wk-overline">Letzte {summary.recent.length} Spiele</h2>
          <div className="wk-card">
            <div
              className="wkx-chart"
              role="img"
              aria-label={`Punkte von ${name} in den letzten ${summary.recent.length} Spielen${best !== null ? `, bestes ${best}` : ""}`}
            >
              {summary.recent.map((score, i) => (
                <i
                  key={i}
                  style={{
                    height: `${Math.max(4, Math.round((Math.max(score, 0) / top) * 100))}%`,
                    background: score === best ? "var(--gold)" : "var(--brand)",
                  }}
                />
              ))}
            </div>
            <div className="wkx-legend">
              <span>Punkte je Spiel, ältestes links</span>
              {best !== null && (
                <span>
                  <i className="wk-dot" aria-hidden="true" />
                  Bestes: <b className="wk-num text-ink">{best}</b>
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="wk-section">
          <div className="wkx-head">
            <h2 className="wk-overline">Direkter Vergleich</h2>
            <span className="wk-caption">Siege {name} : Gegner</span>
          </div>
          <div className="wk-card gap-4">
            {duels.length === 0 ? (
              <p className="wk-hint">Noch keine gemeinsamen Spiele mit anderen.</p>
            ) : (
              duels.map(({ player, wins, losses }) => (
                <button
                  key={player.name}
                  type="button"
                  className="wkx-duel text-left"
                  onClick={() => onPick(player.name)}
                  aria-label={`${name} gegen ${player.name}: ${wins} zu ${losses}. Statistik von ${player.name} zeigen`}
                >
                  <span className="wkx-duel-name">
                    <span aria-hidden="true">{player.emoji ?? "🙂"}</span>
                    <span className="truncate">{player.name}</span>
                  </span>
                  <span className="wk-progress" aria-hidden="true">
                    <i style={{ width: `${Math.round((wins / (wins + losses)) * 100)}%` }} />
                  </span>
                  <span className="wkx-duel-score">
                    {wins} : {losses}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="wk-stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function StatisticsPage() {
  return (
    <Suspense>
      <Statistics />
    </Suspense>
  );
}
