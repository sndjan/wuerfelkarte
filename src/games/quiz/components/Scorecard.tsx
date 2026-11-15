import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, tournamentRules, type Category } from "@/games/yatzy/solver";
import { cn } from "@/lib/utils";
import { QUIZ_EMOJI } from "../config";
import { categoryLabel, shortCategoryLabel } from "../feedback";
import type { QuizCard } from "../types";

type ScorecardProps = {
  card: QuizCard;
  /** Points each open field would get for the current dice; missing = not allowed. */
  options: ReadonlyMap<Category, number>;
  selected: Category | null;
  /** Without a handler the card is a read-only record, e.g. on the result screen. */
  onSelect?: (category: Category) => void;
  /** Just the fields, without the card frame and title — for nesting. */
  bare?: boolean;
  /** The card's heading; the quiz's by default. */
  title?: string;
  /**
   * Upper and lower section side by side, without a heading, so the whole
   * card fits on a phone screen next to the dice.
   */
  split?: boolean;
};

const UPPER = CATEGORIES.slice(0, 6);

// The same pill states as the Yatzy player card's fields. Exported for the
// intro's preview of the card.
export const pill = "flex w-full items-center justify-between gap-2 rounded-full border border-input px-4 py-1.5 text-base shadow-xs transition-colors";
export const filledPill = "bg-surface-sunken";
export const crossedPill = "bg-danger-soft";
export const openPill = "bg-surface hover:bg-surface-sunken/40";

/** The puzzle's scorecard, styled like a player's Wunder sheet. */
export function Scorecard({
  card,
  options,
  selected,
  onSelect,
  bare = false,
  title = `${QUIZ_EMOJI} Deine Karte`,
  split = false,
}: ScorecardProps) {
  const label = split ? shortCategoryLabel : categoryLabel;
  const fieldPill = split ? cn(pill, "px-3.5 py-1 text-[15px]") : pill;
  const { upperBonusThreshold, upperBonus } = tournamentRules;
  const upperSum = UPPER.reduce((sum, c) => sum + (card[c] ?? 0), 0);
  const bonusReached = upperSum >= upperBonusThreshold;

  const field = (category: Category) => {
    const filled = card[category];
    if (filled !== undefined) {
      return (
        <div key={category} className={cn(fieldPill, filled === 0 ? crossedPill : filledPill)}>
          <span>{filled === 0 ? "❌" : filled}</span>
          <span className="truncate text-xs text-muted-foreground">{label(category)}</span>
        </div>
      );
    }
    const points = options.get(category);
    const pointsLabel = points !== undefined && (
      <span
        className={cn(
          "shrink-0 font-bold tabular-nums",
          points > 0 ? "text-brand-accent" : "text-muted-foreground",
        )}
      >
        {points > 0 ? `+${points}` : "❌"}
      </span>
    );
    if (!onSelect) {
      return (
        <div
          key={category}
          className={cn(
            fieldPill,
            "bg-surface",
            selected === category && "border-brand-accent ring-2 ring-brand-accent",
          )}
        >
          <span className="truncate text-muted-foreground">{label(category)}</span>
          {pointsLabel}
        </div>
      );
    }
    const allowed = points !== undefined;
    return (
      <button
        key={category}
        type="button"
        disabled={!allowed}
        onClick={() => allowed && onSelect(category)}
        className={cn(
          fieldPill,
          openPill,
          "text-left disabled:cursor-not-allowed disabled:opacity-50",
          selected === category && "border-brand-accent ring-2 ring-brand-accent",
        )}
      >
        <span className="truncate text-muted-foreground">{label(category)}</span>
        {pointsLabel}
      </button>
    );
  };

  const bonus = (
    <div className={cn("w-full rounded-md bg-surface", split ? "px-1 pt-0.5" : "my-1 px-3 py-2")}>
      <div className="flex items-center justify-center gap-2 font-bold">
        <span>
          {upperSum}
          {!bonusReached && (
            <span className="text-xs font-normal text-muted-foreground">/{upperBonusThreshold}</span>
          )}
        </span>
        {bonusReached && <Badge>+{upperBonus}</Badge>}
      </div>
      <Progress
        value={(upperSum / upperBonusThreshold) * 100}
        className="mt-2"
        indicatorClassName={
          bonusReached ? "bg-brand-strong" : "bg-brand"
        }
      />
    </div>
  );

  if (split) {
    return (
      <Card className="grid grid-cols-2 gap-2 p-2.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          {UPPER.map(field)}
          {bonus}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">{CATEGORIES.slice(6).map(field)}</div>
      </Card>
    );
  }

  const fields = (
    <>
      {UPPER.map(field)}
      {bonus}
      {CATEGORIES.slice(6).map(field)}
    </>
  );

  if (bare) return <div className="flex flex-col gap-2">{fields}</div>;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="mb-1 flex w-full items-center rounded-md bg-surface px-3 py-1.5 font-bold">
        {title}
      </div>
      {fields}
    </Card>
  );
}
