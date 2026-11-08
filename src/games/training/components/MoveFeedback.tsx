import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { describeStep, formatLoss } from "@/games/quiz/feedback";
import type { QuizStep } from "@/games/quiz/types";
import { SmallDie } from "@/games/quiz/components/Die";
import { MoveRanking } from "@/games/quiz/components/PuzzleResult";
import { VERDICT_LABELS, verdict, type Verdict } from "../game";

const VERDICT_COLORS: Record<Verdict, string> = {
  best: "bg-brand-accent text-white",
  great: "bg-brand-accent text-white",
  good: "bg-brand-badge text-white",
  inaccurate: "bg-orange-500 text-white",
  mistake: "bg-destructive text-white",
};

export const verdictColor = (loss: number) => VERDICT_COLORS[verdict(loss)];

export function VerdictBadge({ loss, className }: { loss: number; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold",
        verdictColor(loss),
        className,
      )}
    >
      {VERDICT_LABELS[verdict(loss)]}
    </span>
  );
}

export const rollsLabel = (rollsLeft: number) =>
  rollsLeft === 0 ? "letzter Wurf" : `noch ${rollsLeft} ${rollsLeft === 1 ? "Wurf" : "Würfe"}`;

/**
 * One graded decision: the dice it was made on, what the player did and —
 * if it was not the best — what would have been better and what it cost.
 */
export function StepRow({
  step,
  showRanking = true,
  rankingOpen = false,
}: {
  step: QuizStep;
  showRanking?: boolean;
  rankingOpen?: boolean;
}) {
  const { chosen, better, loss } = describeStep(step);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {step.dice.map((d, j) => (
          <SmallDie key={j} value={d} />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">{rollsLabel(step.rollsLeft)}</span>
        <VerdictBadge loss={step.loss} className="ml-auto" />
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
      {showRanking && step.moves && <MoveRanking moves={step.moves} open={rankingOpen} />}
    </div>
  );
}
