"use client";

import { useMemo } from "react";

import { categoryLabel } from "@/games/quiz/feedback";
import { loadDays, quizStorage } from "@/games/quiz/storage";
import { formatTime } from "@/games/speedrun/config";
import { speedrunStorage } from "@/games/speedrun/storage";
import { trainingStorage } from "@/games/training/storage";
import { useMatchHistory } from "../hooks/useMatchHistory";
import {
  type LossBreakdown,
  lossBreakdown,
  mergeBreakdowns,
  quizDayTurns,
  quizSummary,
  speedrunSummary,
  trainingSummary,
  weakestFields,
} from "../soloStats";

export type SoloKey = "quiz" | "training" | "speedrun";

const number = (value: number | null, digits = 0) =>
  value === null ? "–" : value.toLocaleString("de-DE", { maximumFractionDigits: digits, minimumFractionDigits: digits });

const percent = (rate: number | null) => (rate === null ? "–" : `${Math.round(rate * 100)} %`);

type Numbers = {
  stats: { value: string; label: string }[];
  chart: { values: number[]; lowerIsBetter: boolean; caption: string; format: (v: number) => string };
  breakdown: LossBreakdown | null;
  /** How many of the games counted have a breakdown (older ones have none). */
  analysed: number;
  empty: boolean;
};

function useSoloNumbers(key: SoloKey): Numbers {
  const quiz = useMatchHistory(quizStorage.loadMatches);
  const training = useMatchHistory(trainingStorage.loadMatches);
  const speedrun = useMatchHistory(speedrunStorage.loadMatches);

  return useMemo(() => {
    if (key === "quiz") {
      const s = quizSummary(quiz);
      const turns = Object.values(loadDays()).flatMap(quizDayTurns);
      return {
        empty: s.days === 0,
        stats: [
          { value: `${s.days}`, label: "Tage gespielt" },
          { value: number(s.averageDay), label: "Ø Punkte am Tag" },
          { value: number(s.bestDay), label: "Bester Tag" },
          { value: `${s.perfectPuzzles}`, label: "Perfekte Aufgaben" },
          { value: `${s.longestStreak}`, label: "Längste Serie" },
          { value: `${turns.length}`, label: "Züge bewertet" },
        ],
        chart: {
          values: s.recent,
          lowerIsBetter: false,
          caption: "Punkte je Tag, ältester links",
          format: (v) => number(v),
        },
        breakdown: turns.length ? lossBreakdown(turns) : null,
        analysed: turns.length,
      };
    }
    if (key === "training") {
      const s = trainingSummary(training);
      const analysed = training.filter((m) => m.breakdown);
      return {
        empty: s.games === 0,
        stats: [
          { value: `${s.games}`, label: "Spiele" },
          { value: number(s.averageScore), label: "Ø Punkte" },
          { value: number(s.bestScore), label: "Höchste Punkte" },
          { value: percent(s.optimalRate), label: "Beste Züge" },
          { value: number(s.averageLoss, 1), label: "Ø verschenkt" },
          { value: number(s.recent.length ? Math.min(...s.recent) : null, 1), label: "Wenigste verschenkt" },
        ],
        chart: {
          values: s.recent,
          lowerIsBetter: true,
          caption: "Verschenkte Punkte je Spiel, ältestes links",
          format: (v) => number(v, 1),
        },
        breakdown: analysed.length ? mergeBreakdowns(analysed.map((m) => m.breakdown)) : null,
        analysed: analysed.length,
      };
    }
    const s = speedrunSummary(speedrun);
    const analysed = speedrun.filter((m) => m.category === "classic" && !m.customSeed && m.breakdown);
    return {
      empty: s.runs === 0,
      stats: [
        { value: `${s.runs}`, label: "Läufe" },
        { value: s.bestMs === null ? "–" : formatTime(s.bestMs), label: "Bestzeit" },
        { value: s.averageMs === null ? "–" : formatTime(s.averageMs), label: "Ø Zeit" },
        { value: s.averageStrafeMs === null ? "–" : `${number(s.averageStrafeMs / 1000, 1)} s`, label: "Ø Strafe" },
        { value: percent(s.optimalRate), label: "Beste Züge" },
        {
          value: s.recent.length ? formatTime(s.recent[s.recent.length - 1]) : "–",
          label: "Letzter Lauf",
        },
      ],
      chart: {
        values: s.recent,
        lowerIsBetter: true,
        caption: "Wertungszeit je Lauf, ältester links",
        format: (v) => formatTime(v),
      },
      breakdown: analysed.length ? mergeBreakdowns(analysed.map((m) => m.breakdown)) : null,
      analysed: analysed.length,
    };
  }, [key, quiz, training, speedrun]);
}

const EMPTY: Record<SoloKey, string> = {
  quiz: "Sobald du ein Tagesquiz beendest, stehen hier deine Zahlen.",
  training: "Sobald du ein Training beendest, stehen hier deine Zahlen.",
  speedrun: "Sobald du einen Speedrun ins Ziel bringst, stehen hier deine Zahlen.",
};

/** Numbers, progress and weaknesses of one solo mode: Quiz, Training or Speedrun. */
export function SoloStatistics({ mode }: { mode: SoloKey }) {
  const numbers = useSoloNumbers(mode);

  if (numbers.empty) {
    return (
      <div className="wk-empty md:col-span-2">
        <strong>Noch nichts gespielt</strong>
        {EMPTY[mode]}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 md:col-span-2 md:gap-6">
      <section className="wk-section">
        <div className="wk-stats gap-y-4 md:grid-cols-6 md:py-6">
          {numbers.stats.map((stat) => (
            <div key={stat.label} className="wk-stat">
              <b>{stat.value}</b>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-6">
        <Progress {...numbers.chart} />
        <Weaknesses breakdown={numbers.breakdown} analysed={numbers.analysed} mode={mode} />
      </div>
    </div>
  );
}

function Progress({ values, lowerIsBetter, caption, format }: Numbers["chart"]) {
  if (values.length === 0) return null;
  const best = lowerIsBetter ? Math.min(...values) : Math.max(...values);
  const top = Math.max(...values, 0) || 1;
  return (
    <section className="wk-section">
      <h2 className="wk-overline">Verlauf</h2>
      <div className="wk-card">
        <div className="wkx-chart" role="img" aria-label={`${caption}. Bester Wert ${format(best)}`}>
          {values.map((value, i) => (
            <i
              key={i}
              title={format(value)}
              style={{
                height: `${Math.max(4, Math.round((Math.max(value, 0) / top) * 100))}%`,
                background: value === best ? "var(--gold)" : "var(--brand)",
              }}
            />
          ))}
        </div>
        <div className="wkx-legend">
          <span>{caption}</span>
          <span>
            <i className="wk-dot" aria-hidden="true" />
            Bester: <b className="wk-num text-ink">{format(best)}</b>
          </span>
        </div>
        {lowerIsBetter && <p className="wk-hint">Niedriger ist besser.</p>}
      </div>
    </section>
  );
}

const NO_BREAKDOWN: Record<SoloKey, string> = {
  quiz: "Noch keine bewerteten Züge.",
  training: "Wird ab deinem nächsten Training erfasst.",
  speedrun: "Wird ab deinem nächsten Lauf erfasst.",
};

const UNITS: Record<SoloKey, [string, string]> = {
  quiz: ["Zug", "Zügen"],
  training: ["Spiel", "Spielen"],
  speedrun: ["Lauf", "Läufen"],
};

function Weaknesses({
  breakdown,
  analysed,
  mode,
}: {
  breakdown: LossBreakdown | null;
  analysed: number;
  mode: SoloKey;
}) {
  const total = breakdown ? breakdown.keep + breakdown.score : 0;
  const fields = breakdown ? weakestFields(breakdown) : [];
  const [one, many] = UNITS[mode];

  return (
    <section className="wk-section">
      <div className="wkx-head">
        <h2 className="wk-overline">Schwächen</h2>
        {breakdown && (
          <span className="wk-caption">
            aus {analysed} {analysed === 1 ? one : many}
          </span>
        )}
      </div>
      <div className="wk-card gap-4">
        {!breakdown ? (
          <p className="wk-hint">{NO_BREAKDOWN[mode]}</p>
        ) : total === 0 ? (
          <p className="wk-hint">Kein einziger Punkt verschenkt – jeder Zug war der beste. 🏆</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">Wo die Punkte verloren gehen</p>
              <div className="flex h-3 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                <i className="bg-brand" style={{ width: `${(breakdown.keep / total) * 100}%` }} />
                <i className="bg-danger" style={{ width: `${(breakdown.score / total) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  <span className="mr-1 inline-block size-2 rounded-full bg-brand" aria-hidden="true" />
                  Halten {Math.round((breakdown.keep / total) * 100)} %
                </span>
                <span>
                  <span className="mr-1 inline-block size-2 rounded-full bg-danger" aria-hidden="true" />
                  Eintragen {Math.round((breakdown.score / total) * 100)} %
                </span>
              </div>
            </div>
            {fields.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold">Teuerste Felder</p>
                <ol className="flex flex-col gap-1.5">
                  {fields.map((field) => (
                    <li key={field.category} className="flex items-baseline gap-2 text-sm">
                      <span className="flex-1">{categoryLabel(field.category)}</span>
                      <span className="text-xs text-muted-foreground">{field.turns} Züge</span>
                      <span className="w-20 text-right font-bold text-danger tabular-nums">
                        −{number(field.average, 1)} P.
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">
                  Im Schnitt verschenkte Punkte je Zug, der in diesem Feld endete.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
