"use client";

import { CircleHelp } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QUIZ_NAME } from "../config";
import { useQuiz } from "../hooks/useQuiz";
import { dateKey, puzzlePoints } from "../puzzles";
import { DaySummary } from "./DaySummary";
import { PuzzleResult, pointsColor } from "./PuzzleResult";
import { PuzzleView } from "./PuzzleView";
import { QuizIntro } from "./QuizIntro";

/** The quiz page: today's three puzzles, then the day's summary. */
export function Quiz() {
  const {
    status,
    solver,
    day,
    startedToday,
    tutorialSeen,
    markTutorialSeen,
    matches,
    streak,
    retry,
    keep,
    score,
  } = useQuiz();
  // A puzzle that was just finished stays on screen until "Weiter".
  const [reviewing, setReviewing] = useState<number | null>(null);
  // Opened from the "?" button; first timers get the tutorial by themselves.
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const started = startedToday || (day?.progress.some((p) => p.steps.length > 0) ?? false);
  const showTutorial =
    tutorialOpen || (tutorialSeen === false && !started && status !== "error");

  const header = (
    <PageHeader
      backHref="/"
      title={QUIZ_NAME}
      right={
        !showTutorial && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Tutorial anzeigen"
            onClick={() => setTutorialOpen(true)}
            className="rounded-full bg-white"
          >
            <CircleHelp />
          </Button>
        )
      }
    />
  );

  // The tutorial can be read while the solver table is still loading.
  if (showTutorial) {
    const finished = day?.finishedAt != null;
    return (
      <>
        {header}
        <QuizIntro
          date={day?.date ?? dateKey()}
          streak={streak}
          ready={status === "ready"}
          startLabel={finished ? "Zurück zum Ergebnis" : started ? "Zurück zum Quiz" : "Quiz starten"}
          onStart={() => {
            markTutorialSeen();
            setTutorialOpen(false);
          }}
        />
      </>
    );
  }

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
