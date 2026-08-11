"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDuration } from "@/lib/utils";
import { buildGamemodeStatsSummary, GamemodeStatsSummary, PlayerStanding } from "../stats";
import { MatchPlayer, StoredMatch } from "../types";

const BALOO = "font-[family-name:var(--font-baloo)]";

type Timeframe = "all" | "30d" | "7d";

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  all: "Alle Zeiten",
  "30d": "Letzte 30 Tage",
  "7d": "Letzte 7 Tage",
};

const TIMEFRAME_DAYS: Record<Timeframe, number | null> = {
  all: null,
  "30d": 30,
  "7d": 7,
};

const identity = (emoji: string | undefined, name: string) =>
  `${emoji ?? ""} ${name}`.trim();

const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

const formatWinRate = (rate: number) =>
  rate.toLocaleString(undefined, {
    style: "percent",
    maximumFractionDigits: 0,
  });

type GamemodeStatsProps<TMatch extends StoredMatch<MatchPlayer>> = {
  matches: TMatch[];
  /** Display name of the currently selected gamemode, e.g. "Wunder+". */
  modeName: string;
  /** Golf-scored games (Cabo, …) win with the lowest total instead of the highest. */
  lowerIsBetter?: boolean;
};

/** The redesigned per-gamemode statistics card: podium, records, full ranking. */
export function GamemodeStats<TMatch extends StoredMatch<MatchPlayer>>({
  matches,
  modeName,
  lowerIsBetter = false,
}: GamemodeStatsProps<TMatch>) {
  const [timeframe, setTimeframe] = useState<Timeframe>("all");

  const filtered = useMemo(() => {
    const days = TIMEFRAME_DAYS[timeframe];
    if (days === null) return matches;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return matches.filter((match) => new Date(match.timestamp).getTime() >= cutoff);
  }, [matches, timeframe]);

  const summary = useMemo(
    () => buildGamemodeStatsSummary(filtered, lowerIsBetter),
    [filtered, lowerIsBetter],
  );

  if (matches.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-[20px] bg-background py-5">
        <EmptyCard>Noch keine Spiele in diesem Modus</EmptyCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-background py-5">
      <Header
        modeName={modeName}
        summary={summary}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />
      {summary.gamesPlayed === 0 ? (
        <EmptyCard>Keine Spiele in diesem Zeitraum</EmptyCard>
      ) : (
        <>
          <Podium standings={summary.standings} />
          <RecordCards summary={summary} lowerIsBetter={lowerIsBetter} />
          {summary.standings.length > 3 && (
            <FurtherPlayers standings={summary.standings} />
          )}
        </>
      )}
    </div>
  );
}

function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-2xl bg-card p-4 text-center">
      <p className="text-sm font-extrabold text-muted-foreground">{children}</p>
    </div>
  );
}

function Header({
  modeName,
  summary,
  timeframe,
  onTimeframeChange,
}: {
  modeName: string;
  summary: GamemodeStatsSummary;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}) {
  const gamesLabel = `${summary.gamesPlayed} ${pluralize(summary.gamesPlayed, "SPIEL", "SPIELE")}`;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {modeName.toUpperCase()} · {gamesLabel}
        </h2>
        <RankingInfo />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="shrink-0 rounded-full bg-card px-3 py-1.5 text-[11px] font-extrabold text-foreground">
          {TIMEFRAME_LABELS[timeframe]} ⌄
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={timeframe}
            onValueChange={(value) => onTimeframeChange(value as Timeframe)}
          >
            {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((key) => (
              <DropdownMenuRadioItem key={key} value={key}>
                {TIMEFRAME_LABELS[key]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function RankingInfo() {
  return (
    <Dialog>
      <DialogTrigger aria-label="Erklärung zur Rangliste" className="text-muted-foreground">
        <Info className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Wie wird die Rangliste berechnet?</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Nicht einfach Siege ÷ Spiele – sonst stünde jeder, der genau ein Spiel
          gewonnen hat, mit 100 % ganz oben.
        </DialogDescription>
        <div className="flex flex-col gap-4 text-sm">
          <p>
            Stattdessen startet jeder mit 5 gedachten Extra-Spielen, in denen er
            genau so oft gewinnt, wie es der Zufall erwarten lässt: bei 4
            Spielern also 25 % davon, bei 2 Spielern 50 %.
          </p>
          <p>
            Wer wenig gespielt hat, liegt dadurch nah an diesem Erwartungswert.
            Je mehr Partien dazukommen, desto mehr zählt die echte Bilanz – die
            gedachten Spiele fallen kaum noch ins Gewicht.
          </p>
          <p className="text-muted-foreground">
            Solo-Partien zählen nicht mit, da es dort keinen Gegner zu schlagen
            gibt.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Podium({ standings }: { standings: PlayerStanding[] }) {
  const byRank = new Map(standings.slice(0, 3).map((standing, index) => [index + 1, standing]));

  return (
    <div className="flex items-end gap-3.5">
      {[2, 1, 3].map((rank) => {
        const standing = byRank.get(rank);
        return standing ? <PodiumCard key={rank} rank={rank as 1 | 2 | 3} standing={standing} /> : null;
      })}
    </div>
  );
}

function PodiumCard({ rank, standing }: { rank: 1 | 2 | 3; standing: PlayerStanding }) {
  const subline = `${standing.wins} ${pluralize(standing.wins, "Sieg", "Siege")} · ${formatWinRate(standing.winRate)}`;

  if (rank === 1) {
    return (
      <div className="flex flex-[1.15] flex-col items-center gap-1.5 rounded-2xl bg-card p-4 shadow-[0_0_24px_rgba(242,194,48,.35)]">
        <span className="text-[18px] leading-none">👑</span>
        <span className="text-[30px] leading-none">{standing.emoji}</span>
        <span className={cn(BALOO, "text-base font-extrabold text-foreground")}>
          {standing.name}
        </span>
        <span className="text-[11px] font-extrabold text-muted-foreground">{subline}</span>
        <div className="flex h-[84px] w-full items-center justify-center rounded-t-[12px] bg-gold">
          <span className={cn(BALOO, "text-[26px] font-extrabold text-foreground")}>1</span>
        </div>
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-card p-4">
        <span className="text-[26px] leading-none">{standing.emoji}</span>
        <span className="text-sm font-extrabold text-foreground">{standing.name}</span>
        <span className="text-[11px] font-extrabold text-muted-foreground">{subline}</span>
        <div className="flex h-14 w-full items-center justify-center rounded-t-[12px] bg-silver">
          <span className={cn(BALOO, "text-xl font-extrabold text-foreground")}>2</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-card p-4">
      <span className="text-[26px] leading-none">{standing.emoji}</span>
      <span className="text-sm font-extrabold text-foreground">{standing.name}</span>
      <span className="text-[11px] font-extrabold text-muted-foreground">{subline}</span>
      <div className="flex h-10 w-full items-center justify-center rounded-t-[12px] bg-bronze">
        <span className={cn(BALOO, "text-lg font-extrabold text-foreground")}>3</span>
      </div>
    </div>
  );
}

function RecordCards({
  summary,
  lowerIsBetter,
}: {
  summary: GamemodeStatsSummary;
  lowerIsBetter: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <RecordCard
        label={lowerIsBetter ? "🏆 BESTWERT" : "🏆 HIGHSCORE"}
        value={summary.highscore?.score ?? "–"}
        valueClassName="text-brand-accent"
        sub={summary.highscore ? identity(summary.highscore.emoji, summary.highscore.name) : "–"}
      />
      <RecordCard
        label="⏱ Ø SPIELDAUER"
        value={summary.averageDurationMs !== null ? formatDuration(summary.averageDurationMs) : "–"}
        sub={
          summary.perPlayerDurationMs !== null
            ? `Ø ${formatDuration(summary.perPlayerDurationMs)} pro Spieler`
            : "–"
        }
      />
      <RecordCard
        label={lowerIsBetter ? "📉 NIEDRIGSTER Ø" : "📈 HÖCHSTER Ø"}
        value={summary.bestAverage ? Math.round(summary.bestAverage.average) : "–"}
        sub={
          summary.bestAverage
            ? identity(summary.bestAverage.emoji, summary.bestAverage.name)
            : "–"
        }
      />
      <RecordCard
        label="🔥 SERIE"
        value={
          summary.streak
            ? `${summary.streak.length} ${pluralize(summary.streak.length, "Sieg", "Siege")}`
            : "–"
        }
        sub={
          summary.streak
            ? `${identity(summary.streak.emoji, summary.streak.name)}${summary.streak.active ? ", läuft" : ""}`
            : "–"
        }
      />
    </div>
  );
}

function RecordCard({
  label,
  value,
  valueClassName,
  sub,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  sub: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-card p-3.5">
      <p className="text-[10px] font-extrabold uppercase tracking-[.05em] text-muted-foreground">
        {label}
      </p>
      <p className={cn(BALOO, "text-xl font-extrabold text-foreground", valueClassName)}>
        {value}
      </p>
      <p className="text-[11px] font-bold text-foreground">{sub}</p>
    </div>
  );
}

function FurtherPlayers({ standings }: { standings: PlayerStanding[] }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-card px-4 py-3.5">
      <p className="text-[10px] font-extrabold uppercase tracking-[.05em] text-muted-foreground">
        Weitere Spieler
      </p>
      {standings.slice(3).map((standing, index) => (
        <div key={standing.name} className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-bold text-foreground">
            {index + 4}. {identity(standing.emoji, standing.name)}
          </span>
          <span className="shrink-0 text-[13px] font-bold text-muted-foreground">
            {standing.wins} {pluralize(standing.wins, "Sieg", "Siege")} / {standing.games}{" "}
            {pluralize(standing.games, "Spiel", "Spiele")} · {formatWinRate(standing.winRate)}
          </span>
        </div>
      ))}
    </div>
  );
}
