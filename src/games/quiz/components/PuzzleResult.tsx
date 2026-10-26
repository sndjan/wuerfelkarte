import { Check, ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { describeStep, formatLoss, moveText, pointsLabel } from "../feedback";
import { pointsTier, puzzlePoints, type PointsTier } from "../puzzles";
import type { PuzzleProgress, QuizMove, QuizPuzzle } from "../types";
import { SmallDie } from "./Die";
import { Scorecard } from "./Scorecard";

const TIER_COLORS: Record<PointsTier, string> = {
  perfect: "bg-brand-accent text-white",
  good: "bg-brand-badge text-white",
  close: "bg-orange-500 text-white",
  miss: "bg-muted text-muted-foreground",
};

export const pointsColor = (points: number) => TIER_COLORS[pointsTier(points)];

/** A folded-away section of the result card. */
function Fold({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        {label}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

/** A step's best moves and the player's own. */
function MoveRanking({ moves }: { moves: QuizMove[] }) {
  return (
    <Fold label="Top-Züge">
      <ol className="flex flex-col gap-1">
        {moves.map((move) => (
          <li
            key={move.rank}
            className={cn(
              "flex items-center gap-2 rounded-full border border-input px-3 py-1 text-sm",
              move.chosen
                ? "border-brand-accent bg-brand-accent/10 font-semibold"
                : "bg-white dark:bg-[#212121]",
            )}
          >
            <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
              {move.rank}.
            </span>
            <span className="min-w-0 flex-1 truncate">
              {moveText(move)}
              {move.chosen && <span className="ml-1 text-xs text-brand-accent">· Du</span>}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {move.loss === 0 ? "beste" : `−${formatLoss(move.loss)} Pkt.`}
            </span>
          </li>
        ))}
      </ol>
    </Fold>
  );
}

/** Every decision of a finished puzzle next to the solver's choice. */
export function PuzzleResult({
  title,
  puzzle,
  progress,
  collapsible = false,
}: {
  title: string;
  puzzle: QuizPuzzle;
  progress: PuzzleProgress;
  /** Folded to its title and points until tapped, e.g. on the day's summary. */
  collapsible?: boolean;
}) {
  const points = puzzlePoints(progress);
  const entry = progress.steps.findLast((step) => step.kind === "score");
  const badge = (
    <span className={cn("rounded-full px-3 py-1 text-sm font-bold", pointsColor(points))}>
      {pointsLabel(points)} · +{points}
    </span>
  );
  const details = (
    <>
      <Fold label="Karte anzeigen">
        {/* The card as the puzzle gave it, with the player's entry marked. */}
        <Scorecard
          bare
          card={puzzle.card}
          options={entry?.kind === "score" ? new Map([[entry.category, entry.points]]) : new Map()}
          selected={entry?.kind === "score" ? entry.category : null}
        />
      </Fold>
      <ol className="flex flex-col gap-3">
        {progress.steps.map((step, i) => {
          const { chosen, better, loss } = describeStep(step);
          return (
            <li key={i} className="flex flex-col gap-1">
              <div className="flex gap-1">
                {step.dice.map((d, j) => (
                  <SmallDie key={j} value={d} />
                ))}
                <span className="ml-2 self-center text-xs text-muted-foreground">
                  {step.rollsLeft === 0 ? "letzter Wurf" : `noch ${step.rollsLeft}`}
                </span>
              </div>
              <p className="flex items-start gap-1 text-sm">
                {better ? (
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : (
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-accent" />
                )}
                <span>
                  {chosen}
                  {better && <span className="text-muted-foreground"> (−{formatLoss(loss)} Pkt.)</span>}
                </span>
              </p>
              {better && (
                <p className="pl-5 text-sm text-muted-foreground">
                  besser: <b className="text-foreground">{better}</b>
                </p>
              )}
              {step.moves && <MoveRanking moves={step.moves} />}
            </li>
          );
        })}
      </ol>
    </>
  );

  if (collapsible) {
    // A named group, so the folds inside keep their own chevrons.
    return (
      <Card className="gap-0 p-0">
        <details className="group/result">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
            <h2 className="font-bold">{title}</h2>
            <span className="flex items-center gap-2">
              {badge}
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open/result:rotate-180" />
            </span>
          </summary>
          <div className="flex flex-col gap-3 px-4 pb-4">{details}</div>
        </details>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        {badge}
      </div>
      {details}
    </Card>
  );
}
