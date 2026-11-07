import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Solver } from "@/games/yatzy/solver";
import { categoryLabel, formatLoss } from "@/games/quiz/feedback";
import { Scorecard } from "@/games/quiz/components/Scorecard";
import { biggestMistakes, totalScore, trainingStats } from "../game";
import type { StoredTrainingMatch, TrainingGame } from "../types";
import { StepRow, verdictColor } from "./MoveFeedback";

const decimal = (n: number) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-muted px-2 py-2 text-center">
      <span className="text-lg font-extrabold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

/** The end of a training game: score, decision quality and every move to review. */
export function TrainingSummary({
  solver,
  game,
  matches,
  onRestart,
}: {
  solver: Solver;
  game: TrainingGame;
  matches: StoredTrainingMatch[];
  onRestart: () => void;
}) {
  const score = totalScore(game);
  const stats = trainingStats(game);
  const optimalAverage = solver.expectedScore({ filled: [], upperSum: 0 });
  const mistakes = biggestMistakes(game);
  const scores = matches.map((m) => m.players[0]?.score ?? 0);
  const best = Math.max(...scores, score);
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : score;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3 p-5 text-center">
        <span className="text-sm font-semibold text-muted-foreground">Endstand</span>
        <span
          className="text-5xl font-extrabold tabular-nums"
          style={{ fontFamily: "var(--font-baloo)" }}
        >
          {score}
        </span>
        <p className="text-sm text-muted-foreground">
          Perfektes Spiel holt im Schnitt {decimal(optimalAverage)} Punkte. Deine Entscheidungen
          haben dich rund <b className="text-foreground">{decimal(stats.loss)}</b> erwartete Punkte
          gekostet – der Rest war Würfelglück.
        </p>
        <div className="grid w-full grid-cols-3 gap-2">
          <Stat label="Spielstärke" value={`${stats.rating}`} />
          <Stat label="beste Züge" value={`${stats.optimal}/${stats.decisions}`} />
          <Stat label="verschenkt" value={`−${decimal(stats.loss)}`} />
        </div>
        {matches.length > 1 && (
          <div className="grid w-full grid-cols-3 gap-2">
            <Stat label="Trainings" value={`${matches.length}`} />
            <Stat label="Rekord" value={`${best}`} />
            <Stat label="Schnitt" value={`${Math.round(average)}`} />
          </div>
        )}
        <Button className="w-full" onClick={onRestart}>
          Neues Spiel
        </Button>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="font-bold">Größte Fehler</h2>
        {mistakes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Kein einziger Fehler – jeder Zug war optimal. 🏆
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {mistakes.map(({ step, turn }, i) => (
              <li key={i} className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">Zug {turn}</span>
                <StepRow step={step} />
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <h2 className="font-bold">Alle Züge</h2>
        {game.turns.map((turn, index) => {
          const loss = turn.steps.reduce((sum, s) => sum + s.loss, 0);
          return (
            <details key={index} className="group rounded-xl border border-input">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                <span className={cn("size-2.5 shrink-0 rounded-full", verdictColor(loss))} />
                <span className="w-12 shrink-0 text-muted-foreground">Zug {index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {categoryLabel(turn.category)}{" "}
                  {turn.points === 0 ? "gestrichen" : turn.points}
                  {turn.bonus > 0 && <span className="text-brand-accent"> +{turn.bonus}</span>}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {loss === 0 ? "optimal" : `−${formatLoss(loss)}`}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-4 px-3 pb-3 pt-1">
                {turn.steps.map((step, j) => (
                  <StepRow key={j} step={step} />
                ))}
              </div>
            </details>
          );
        })}
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <h2 className="font-bold">Deine Karte</h2>
        <Scorecard bare card={game.card} options={new Map()} selected={null} />
      </Card>
    </div>
  );
}
