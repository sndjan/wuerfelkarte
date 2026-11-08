"use client";

import { Play } from "lucide-react";
import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { dateKey } from "@/games/quiz/puzzles";
import {
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  formatSeconds,
  formatTime,
} from "../config";
import { goldSegments, personalBest, sumOfBest } from "../records";
import { dailyAttempted } from "../storage";
import type { SpeedrunCategory, StoredSpeedrunMatch } from "../types";

const shortDate = (iso: string) => {
  const date = new Date(iso);
  const today = dateKey();
  if (dateKey(date) === today) {
    return `Heute, ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
};

type StartPanelProps = {
  category: SpeedrunCategory;
  onCategory: (category: SpeedrunCategory) => void;
  matches: StoredSpeedrunMatch[];
  ready: boolean;
  onStart: () => void;
};

/** Category, personal best and recent runs — and the button that starts the clock. */
export function StartPanel({ category, onCategory, matches, ready, onStart }: StartPanelProps) {
  const runs = useMemo(() => matches.filter((m) => m.category === category), [matches, category]);
  const pb = personalBest(matches, category);
  const best = sumOfBest(goldSegments(matches, category));
  const recent = runs.slice(-5).reverse();
  const counted = category !== "any";

  const today = dateKey();
  const todaysRanked = matches.find((m) => m.category === "daily" && m.date === today && m.ranked);
  const attempted = category === "daily" && dailyAttempted(today);

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
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col gap-4 px-4 pb-6">
      <div role="tablist" aria-label="Kategorie" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {CATEGORIES.map((c) => {
          const selected = c === category;
          const open = c === "daily" && !dailyAttempted(today);
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onCategory(c)}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-full text-[15px] font-bold transition-colors",
                selected ? "bg-card font-extrabold shadow-sm" : "text-foreground/80 hover:bg-card/50",
              )}
            >
              {CATEGORY_LABELS[c]}
              {open && <span className="size-2 rounded-full bg-brand-badge" aria-label="heute noch offen" />}
            </button>
          );
        })}
      </div>

      <p className="-mt-1 px-1 text-sm text-muted-foreground">{CATEGORY_DESCRIPTIONS[category]}</p>

      {category === "daily" && (
        <p className="rounded-xl bg-muted px-3 py-2 text-sm">
          {todaysRanked ? (
            <>
              Heute gewertet: <b className="tabular-nums">{formatTime(todaysRanked.wertungMs)}</b>. Weitere
              Läufe sind Übung – die Würfel kennst du ja schon.
            </>
          ) : attempted ? (
            <>Dein gewerteter Lauf von heute wurde abgebrochen. Weitere Läufe sind Übung.</>
          ) : (
            <>Dein erster Lauf heute wird gewertet und anonym mit allen verglichen.</>
          )}
        </p>
      )}

      <Card className="gap-1 p-5">
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Persönliche Bestzeit</span>
        {pb ? (
          <>
            <span
              className="text-6xl leading-none font-extrabold tabular-nums"
              style={{ fontFamily: "var(--font-baloo)" }}
            >
              {formatTime(pb.wertungMs)}
            </span>
            <span className="text-sm text-muted-foreground">
              {counted
                ? `${formatTime(pb.timeMs)} Zeit + ${formatSeconds(pb.strafeMs)} Strafe`
                : `${pb.score} Punkte`}{" "}
              · {shortDate(pb.timestamp)}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Noch keine – dein erster Lauf setzt sie.</span>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-hairline pt-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Summe der Bestsplits</span>
            <span className="flex items-center gap-1.5 text-xl font-bold tabular-nums">
              <span className="size-2.5 rounded-sm bg-gold" aria-hidden="true" />
              {best !== null ? formatTime(best) : "–"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Läufe</span>
            <span className="text-xl font-bold tabular-nums">{runs.length}</span>
          </div>
        </div>
      </Card>

      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-lg font-bold">Letzte Läufe</h2>
          <Card className="gap-0 overflow-hidden p-0">
            {recent.map((run) => (
              <div key={run.id} className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-0">
                <span className="flex flex-1 items-center gap-2 text-[15px] font-semibold">
                  {shortDate(run.timestamp)}
                  {run.id === pb?.id && (
                    <span className="rounded-full bg-gold px-2 text-xs font-extrabold text-black">PB</span>
                  )}
                  {run.category === "daily" && !run.ranked && (
                    <span className="rounded-full bg-muted px-2 text-xs font-bold">Übung</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {counted ? `Strafe +${formatSeconds(run.strafeMs)}` : `${run.score} P.`}
                </span>
                <span className="w-16 text-right text-lg font-bold tabular-nums">{formatTime(run.wertungMs)}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button
          className="h-16 rounded-full bg-brand-accent text-xl text-white shadow-lg hover:bg-brand-accent/90"
          style={{ fontFamily: "var(--font-baloo)" }}
          disabled={!ready}
          onClick={onStart}
        >
          <Play className="size-6 fill-current" />
          {ready ? "Würfeln & los" : "Solver lädt …"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Die Uhr startet mit dem ersten Wurf und hält nicht an · Leertaste am Rechner
        </p>
      </div>
    </div>
  );
}
