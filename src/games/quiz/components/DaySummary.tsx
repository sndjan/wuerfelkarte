"use client";

import { CalendarDays, Share2 } from "lucide-react";
import { animate, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, shareText } from "../config";
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

// Where the sparkles of a perfect total fly, as angle (degrees) and colour.
const SPARKLES = [
  [-160, "text-gold"],
  [-110, "text-pink-400"],
  [-60, "text-sky-400"],
  [-15, "text-brand-accent"],
  [20, "text-gold"],
  [160, "text-sky-400"],
  [200, "text-brand-accent"],
] as const;

/**
 * The total, counted up from 0 with a small pop at the end every time the
 * summary opens; a perfect total also sweeps through colours and sparkles.
 * The final number reserves its width, so nothing shifts.
 */
function CountUp({ value, perfect }: { value: number; perfect: boolean }) {
  const reduceMotion = useReducedMotion() ?? false;
  const [shown, setShown] = useState(0);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    setLanded(false);
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => setLanded(true),
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  return (
    <span className="relative inline-block">
      <motion.span
        className={cn("inline-grid", perfect && (landed || reduceMotion) && "text-shimmer")}
        animate={landed ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <span className="invisible col-start-1 row-start-1">{value}</span>
        <span className="col-start-1 row-start-1 text-right">{shown}</span>
      </motion.span>
      {perfect &&
        landed &&
        SPARKLES.map(([angle, color], i) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <motion.span
              key={i}
              aria-hidden="true"
              className={cn("pointer-events-none absolute top-1/2 left-1/2 -mt-2 -ml-1.5 text-base", color)}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0.6],
                x: Math.cos(rad) * 70,
                y: Math.sin(rad) * 38,
              }}
              transition={{ duration: 0.9, delay: i * 0.03, ease: "easeOut" }}
            >
              ✦
            </motion.span>
          );
        })}
    </span>
  );
}

/** The day's total, the streak and every puzzle's review. */
export function DaySummary({ day, matches, streak, archive = false }: DaySummaryProps) {
  const points = day.progress.map(puzzlePoints);
  const total = points.reduce((a, b) => a + b, 0);
  const max = points.length * POINTS_PERFECT;
  const perfect = points.every((p) => p === POINTS_PERFECT);
  // From the losses, so days scored on an older point scale still count.
  const perfectDays = matches.filter((m) => m.losses.every((loss) => loss === 0)).length;

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn(
          "flex flex-col items-center gap-2 p-5 text-center",
          perfect && "glow-border border-transparent",
        )}
      >
        <p className="text-sm font-semibold text-muted-foreground">
          {archive ? "Aus dem Archiv" : "Heute"} · {formatDate(day.date)}
        </p>
        <p className="text-5xl font-extrabold tabular-nums">
          <CountUp value={total} perfect={perfect} />
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
          collapsible
          puzzle={day.puzzles[i]}
          progress={progress}
        />
      ))}
    </div>
  );
}
