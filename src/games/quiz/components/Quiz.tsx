"use client";

import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QUIZ_NAME } from "../config";
import { useQuiz } from "../hooks/useQuiz";
import { puzzlePoints } from "../puzzles";
import { DaySummary } from "./DaySummary";
import { PuzzleResult, pointsColor } from "./PuzzleResult";
import { PuzzleView } from "./PuzzleView";

/** The quiz page: today's three puzzles, then the day's summary. */
export function Quiz() {
  const { status, solver, day, matches, streak, retry, keep, score } = useQuiz();
  // A puzzle that was just finished stays on screen until "Weiter".
  const [reviewing, setReviewing] = useState<number | null>(null);

  const header = <PageHeader backHref="/" title={QUIZ_NAME} />;

  if (status === "error") {
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <p>Das Quiz konnte nicht geladen werden.</p>
          <Button onClick={retry}>Nochmal versuchen</Button>
        </div>
      </>
    );
  }

  if (status === "loading" || !solver || !day) {
    return (
      <>
        {header}
        <p className="px-4 py-12 text-center text-muted-foreground">Quiz wird geladen…</p>
      </>
    );
  }

  const current = day.progress.findIndex((p) => !p.done);
  const [year, month, date] = day.date.split("-");

  // Like the Chaoswunder mission dots, coloured by each finished puzzle's result.
  const dots = (
    <div className="flex flex-row justify-center gap-1.5 pt-1">
      {day.progress.map((p, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full",
            p.done
              ? pointsColor(puzzlePoints(p))
              : i === current
                ? "bg-foreground"
                : "bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );

  return (
    <>
      {header}
      <div className="flex flex-col gap-4 px-4 pb-8">
        {(reviewing !== null || current === -1) && (
          <p className="text-center text-sm text-muted-foreground">
            Tagesquiz vom {date}.{month}.{year}
          </p>
        )}

        {reviewing !== null ? (
          <>
            <PuzzleResult
              title={`Aufgabe ${reviewing + 1}`}
              puzzle={day.puzzles[reviewing]}
              progress={day.progress[reviewing]}
            />
            <Button onClick={() => setReviewing(null)}>
              {current === -1 ? "Zum Ergebnis" : "Nächste Aufgabe"}
            </Button>
          </>
        ) : current === -1 ? (
          <DaySummary day={day} matches={matches} streak={streak} />
        ) : (
          <PuzzleView
            key={`${current}-${day.progress[current].steps.length}`}
            solver={solver}
            title={`Aufgabe ${current + 1} von ${day.puzzles.length}`}
            dots={dots}
            puzzle={day.puzzles[current]}
            progress={day.progress[current]}
            onKeep={(held) => keep(current, held)}
            onScore={(category) => {
              score(current, category);
              setReviewing(current);
            }}
          />
        )}
      </div>
    </>
  );
}
