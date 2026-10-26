"use client";

import { CalendarDays, Share2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { shareText } from "../config";
import { POINTS_PERFECT, puzzlePoints } from "../puzzles";
import type { QuizDay, StoredQuizMatch } from "../types";
import { PuzzleResult } from "./PuzzleResult";
import { ScoreDistribution } from "./ScoreDistribution";

type DaySummaryProps = {
  day: QuizDay;
  matches: StoredQuizMatch[];
  streak: number;
  /** A past day, opened from the archive. */
  archive?: boolean;
};

async function share(text: string) {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Ergebnis kopiert");
  } catch (error) {
    // Closing the share sheet is not an error worth reporting.
    if ((error as Error)?.name !== "AbortError") toast.error("Teilen hat nicht geklappt");
  }
}

/** The day's total, the streak and every puzzle's review. */
export function DaySummary({ day, matches, streak, archive = false }: DaySummaryProps) {
  const points = day.progress.map(puzzlePoints);
  const total = points.reduce((a, b) => a + b, 0);
  const max = points.length * POINTS_PERFECT;
  // From the losses, so days scored on an older point scale still count.
  const perfectDays = matches.filter((m) => m.losses.every((loss) => loss === 0)).length;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 p-5 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          {archive ? "Aus dem Archiv" : "Heute"}
        </p>
        <p className="text-5xl font-extrabold tabular-nums">
          {total}
          <span className="text-2xl text-muted-foreground">/{max}</span>
        </p>
        {!archive && <p className="text-sm text-muted-foreground">Morgen gibt es neue Aufgaben.</p>}
        <div className="mt-2 flex w-full gap-2">
          <Button className="flex-1" onClick={() => share(shareText(day.date, points))}>
            <Share2 />
            Teilen
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link href="/quiz/archiv">
              <CalendarDays />
              Zum Archiv
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Serie", value: `🔥 ${streak}` },
          { label: "Gespielt", value: matches.length },
          { label: "Perfekte Tage", value: perfectDays },
        ].map(({ label, value }) => (
          <Card key={label} className="gap-0 p-3">
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <ScoreDistribution date={day.date} total={total} />

      {day.progress.map((progress, i) => (
        <PuzzleResult
          key={i}
          title={`Aufgabe ${i + 1}`}
          puzzle={day.puzzles[i]}
          progress={progress}
        />
      ))}
    </div>
  );
}
