"use client";

import { BarChart3, BookOpen, Hash, Play, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isGuest, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { formatTime } from "../config";
import { type LeaderboardRow, fetchLeaderboard, submitBest } from "../leaderboard";
import { personalBest } from "../records";
import { normalizeSeed } from "../run";
import type { SpeedrunCategory, StoredSpeedrunMatch } from "../types";

type StartPanelProps = {
  category: SpeedrunCategory;
  matches: StoredSpeedrunMatch[];
  ready: boolean;
  onStart: () => void;
  /** Starts a run on a typed-in seed. */
  onStartSeed: (seed: string) => void;
};

/** Personal best, the global leaderboard and the button that starts the clock. */
export function StartPanel({ category, matches, ready, onStart, onStartSeed }: StartPanelProps) {
  const runs = useMemo(() => matches.filter((m) => m.category === category).length, [matches, category]);
  const pb = personalBest(matches, category);
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedInput, setSeedInput] = useState("");
  const seed = normalizeSeed(seedInput);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || !ready) return;
      if ((event.target as HTMLElement | null)?.closest("button, a, input, textarea")) return;
      event.preventDefault();
      onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, onStart]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col gap-4 px-4">
      <div className="flex flex-col items-center pt-2">
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Deine Bestzeit</span>
        {pb ? (
          <span
            className="text-6xl leading-tight font-extrabold tabular-nums"
            style={{ fontFamily: "var(--font-baloo)" }}
          >
            {formatTime(pb.wertungMs)}
          </span>
        ) : (
          <span className="py-3 text-xl font-bold">Noch keine</span>
        )}
        {runs > 0 && (
          <span className="text-sm text-muted-foreground">
            {runs} {runs === 1 ? "Lauf" : "Läufe"}
          </span>
        )}
      </div>

      <Leaderboard pb={pb} />

      <div className="sticky bottom-0 mt-auto -mx-4 flex flex-col gap-2 bg-background px-4 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Button
          className="h-16 rounded-full text-xl"
          style={{ fontFamily: "var(--font-baloo)" }}
          disabled={!ready}
          onClick={onStart}
        >
          <Play className="size-6 fill-current" />
          {ready ? "Würfeln & los" : "Solver lädt …"}
        </Button>
        {seedOpen ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready && seed) onStartSeed(seed);
            }}
          >
            <Input
              aria-label="Seed"
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              placeholder="Seed, z. B. K7M2QX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              className="bg-card font-mono text-base uppercase"
            />
            <Button type="submit" variant="outline" disabled={!ready || !seed} className="shrink-0">
              <Play className="fill-current" />
              Los
            </Button>
          </form>
        ) : (
          <div className="flex justify-center gap-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSeedOpen(true)}>
              <Hash />
              Seed
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link href="/statistik?spiel=speedrun">
                <BarChart3 />
                Statistik
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link href="/regeln/speedrun/speedrun">
                <BookOpen />
                Regeln
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const LEADERBOARD_SIZE = 5;

/**
 * The global top five. A signed-in account sends its best first, so the list
 * already holds it; signed out, a link to sign in takes the account's place.
 */
function Leaderboard({ pb }: { pb: StoredSpeedrunMatch | null }) {
  const { user, loading, available } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[] | null | undefined>(undefined);
  const account = user && !isGuest(user) ? user : null;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      if (account && pb) await submitBest(pb, account.id);
      const next = await fetchLeaderboard(LEADERBOARD_SIZE);
      if (!cancelled) setRows(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, account, pb]);

  if (!available) return null;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <Trophy className="size-4 text-gold" aria-hidden="true" />
        <h2 className="flex-1 font-bold">Bestenliste</h2>
      </div>
      {rows === undefined ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Lädt …</p>
      ) : rows === null ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Gerade nicht erreichbar.</p>
      ) : rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Noch leer – hol dir Platz 1.</p>
      ) : (
        <ol>
          {rows.map((row, i) => (
            <li
              key={`${row.rank}-${row.name}-${i}`}
              className={cn(
                "flex h-9 items-center gap-3 border-t border-hairline px-4 tabular-nums",
                row.isMe && "bg-brand-soft font-bold",
                // The own row below the top ten, after a gap.
                i > 0 && row.rank > rows[i - 1].rank + 1 && "border-t-2 border-dashed",
              )}
            >
              <span
                className={cn(
                  "w-6 text-right text-sm font-bold",
                  row.rank === 1 ? "text-gold" : "text-muted-foreground",
                )}
              >
                {row.rank}
              </span>
              <span className="w-6 text-center" aria-hidden="true">
                {row.emoji ?? "🙂"}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {row.name}
                {row.isMe && " (du)"}
              </span>
              <span className="font-bold">{formatTime(row.wertungMs)}</span>
            </li>
          ))}
        </ol>
      )}
      {!loading && !account && (
        <Link
          href="/konto"
          className="block border-t border-hairline px-4 py-2.5 text-sm font-semibold text-brand-accent"
        >
          Anmelden und mitmachen
        </Link>
      )}
    </Card>
  );
}
