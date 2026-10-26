"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ARCHIVE_START, POINTS_PERFECT, PUZZLES_PER_DAY, dateKey } from "../puzzles";
import { loadDays, quizStorage } from "../storage";
import type { StoredQuizMatch } from "../types";
import { pointsColor } from "./PuzzleResult";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type ArchiveState = {
  today: string;
  matches: Map<string, StoredQuizMatch>;
  /** Days with a decision made but not finished. */
  started: Set<string>;
};

function readArchive(): ArchiveState {
  const matches = new Map(quizStorage.loadMatches().map((m) => [m.id, m]));
  const started = new Set(
    Object.values(loadDays())
      .filter((d) => d.finishedAt == null && d.progress.some((p) => p.steps.length > 0))
      .map((d) => d.date),
  );
  return { today: dateKey(), matches, started };
}

/** Year and month (0-based) of a YYYY-MM-DD date. */
const monthOf = (date: string) => {
  const [year, month] = date.split("-").map(Number);
  return { year, month: month - 1 };
};

/**
 * A finished day's colour, by its average puzzle. Days from older point
 * scales can not be compared, so they only show whether they were perfect.
 */
function matchColor(match: StoredQuizMatch) {
  if (match.losses.every((loss) => loss === 0)) return pointsColor(POINTS_PERFECT);
  if (match.scale !== POINTS_PERFECT) return "bg-muted-foreground/25 text-foreground";
  const average = match.points.reduce((a, b) => a + b, 0) / match.points.length;
  return pointsColor(Math.min(Math.round(average), POINTS_PERFECT - 1));
}

/** Every past quiz day on a month calendar; tapping one plays or reviews it. */
export function QuizArchive() {
  // Read after mount: storage and the local date do not exist on the server.
  const [state, setState] = useState<ArchiveState | null>(null);
  const [shown, setShown] = useState<{ year: number; month: number } | null>(null);
  useEffect(() => {
    const archive = readArchive();
    setState(archive);
    setShown(monthOf(archive.today));
  }, []);

  const header = <PageHeader backHref="/quiz" title="Archiv" />;
  if (!state || !shown) return header;

  const { today, matches, started } = state;
  const first = new Date(shown.year, shown.month, 1);
  const daysInMonth = new Date(shown.year, shown.month + 1, 0).getDate();
  // Monday first, as German calendars are.
  const offset = (first.getDay() + 6) % 7;
  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    dateKey(new Date(shown.year, shown.month, i + 1)),
  );
  const offered = dates.filter((d) => d >= ARCHIVE_START && d <= today);
  const played = offered.filter((d) => matches.has(d)).length;

  const start = monthOf(ARCHIVE_START);
  const current = monthOf(today);
  const index = (m: { year: number; month: number }) => m.year * 12 + m.month;
  const step = (delta: number) => {
    const next = new Date(shown.year, shown.month + delta, 1);
    setShown({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <>
      {header}
      <div className="flex flex-col gap-4 px-4 pb-8">
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Vorheriger Monat"
              disabled={index(shown) <= index(start)}
              onClick={() => step(-1)}
            >
              <ChevronLeft />
            </Button>
            <h2 className="font-bold">
              {first.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Nächster Monat"
              disabled={index(shown) >= index(current)}
              onClick={() => step(1)}
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="pb-1 text-xs font-semibold text-muted-foreground">
                {weekday}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {dates.map((date, i) => {
              const match = matches.get(date);
              const cell = cn(
                "flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums",
                date === today && "ring-2 ring-brand-accent",
              );
              if (date < ARCHIVE_START || date > today) {
                return (
                  <span key={date} className={cn(cell, "text-muted-foreground/40")}>
                    {i + 1}
                  </span>
                );
              }
              return (
                <Link
                  key={date}
                  href={date === today ? "/quiz" : `/quiz/archiv/${date}`}
                  className={cn(
                    cell,
                    match
                      ? cn(matchColor(match), "font-bold")
                      : started.has(date)
                        ? "border-2 border-dashed border-brand-accent"
                        : "border bg-card",
                  )}
                >
                  {i + 1}
                  {match && (
                    <span className="text-[10px] leading-none font-medium opacity-90">
                      {match.scale === POINTS_PERFECT ? match.players[0]?.score : "✓"}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {played} von {offered.length} {offered.length === 1 ? "Tag" : "Tagen"} gespielt · bis zu{" "}
          {PUZZLES_PER_DAY * POINTS_PERFECT} Punkte pro Tag
        </p>
      </div>
    </>
  );
}
