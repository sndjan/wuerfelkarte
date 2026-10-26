"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QUIZ_NAME, formatDate } from "../config";
import { useQuiz } from "../hooks/useQuiz";
import { dateKey, puzzlePoints } from "../puzzles";
import { DaySummary } from "./DaySummary";
import { PuzzleResult, pointsColor } from "./PuzzleResult";
import { PuzzleView } from "./PuzzleView";
import { QuizIntro } from "./QuizIntro";

/**
 * The quiz page: a day's three puzzles, then the day's summary. Today's
 * without a date, a past day's when opened from the archive.
 */
export function Quiz({ date }: { date?: string }) {
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
    archive,
    roll,
    keep,
    score,
  } = useQuiz(date);
  // A puzzle that was just finished stays on screen until "Weiter".
  const [reviewing, setReviewing] = useState<number | null>(null);
  // Opened from the "?" button; first timers get the tutorial by themselves.
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const started =
    startedToday || (day?.progress.some((p) => p.steps.length > 0) ?? false);
  const showTutorial =
    tutorialOpen ||
    (tutorialSeen === false && !started && status !== "error" && status !== "missing");

  const header = (
    <PageHeader
      backHref={archive ? "/quiz/archiv" : "/"}
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
          date={day?.date ?? date ?? dateKey()}
          streak={streak}
          ready={status === "ready"}
          startLabel={
            finished
              ? "Zum Ergebnis"
              : started
                ? "Zum Quiz"
                : "Quiz starten"
          }
          onStart={() => {
            markTutorialSeen();
            setTutorialOpen(false);
          }}
        />
      </>
    );
  }

  if (status === "missing") {
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <p>Für diesen Tag gibt es kein Quiz.</p>
          <Button asChild>
            <Link href="/quiz/archiv">Zum Archiv</Link>
          </Button>
        </div>
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
        <p className="px-4 py-12 text-center text-muted-foreground">
          Quiz wird geladen…
        </p>
      </>
    );
  }

  const current = day.progress.findIndex((p) => !p.done);
  // Today's puzzles go without a date while they are played.
  const dated = (title: string) => `${title} · ${formatDate(day.date)}`;

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
        {reviewing !== null ? (
          <>
            <PuzzleResult
              title={dated(`Aufgabe ${reviewing + 1}`)}
              puzzle={day.puzzles[reviewing]}
              progress={day.progress[reviewing]}
            />
            <Button onClick={() => setReviewing(null)}>
              {current === -1 ? "Zum Ergebnis" : "Nächste Aufgabe"}
            </Button>
          </>
        ) : current === -1 ? (
          <DaySummary day={day} matches={matches} streak={streak} archive={archive} />
        ) : (
          <PuzzleView
            key={`${current}-${day.progress[current].rolled}-${day.progress[current].steps.length}`}
            solver={solver}
            title={
              archive
                ? dated(`Aufgabe ${current + 1} von ${day.puzzles.length}`)
                : `Aufgabe ${current + 1} von ${day.puzzles.length}`
            }
            dots={dots}
            puzzle={day.puzzles[current]}
            progress={day.progress[current]}
            onRoll={() => roll(current)}
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
