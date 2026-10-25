import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, tournamentRules, type Category } from "@/games/yatzy/solver";
import { cn } from "@/lib/utils";
import { QUIZ_EMOJI } from "../config";
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
};

const UPPER = CATEGORIES.slice(0, 6);

// The same pill states as the Yatzy player card's fields.
const pill = "flex w-full items-center justify-between gap-2 rounded-full border border-input px-4 py-1.5 text-base shadow-xs transition-colors";
const filledPill = "bg-gray-100 dark:bg-[#2f2f2f]";
const crossedPill = "bg-red-100 dark:bg-[#950606]";
const openPill = "bg-white hover:bg-gray-50 dark:bg-[#212121] dark:hover:bg-[#2a2a2a]";

/** The puzzle's scorecard, styled like a player's Wunder sheet. */
export function Scorecard({ card, options, selected, onSelect, bare = false }: ScorecardProps) {
  const { upperBonusThreshold, upperBonus } = tournamentRules;
  const upperSum = UPPER.reduce((sum, c) => sum + (card[c] ?? 0), 0);
  const bonusReached = upperSum >= upperBonusThreshold;

  const field = (category: Category) => {
    const filled = card[category];
    if (filled !== undefined) {
      return (
        <div key={category} className={cn(pill, filled === 0 ? crossedPill : filledPill)}>
          <span>{filled === 0 ? "❌" : filled}</span>
          <span className="truncate text-xs text-muted-foreground">{category}</span>
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
            pill,
            "bg-white dark:bg-[#212121]",
            selected === category && "border-brand-accent ring-2 ring-brand-accent",
          )}
        >
          <span className="truncate text-muted-foreground">{category}</span>
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
          pill,
          openPill,
          "text-left disabled:cursor-not-allowed disabled:opacity-50",
          selected === category && "border-brand-accent ring-2 ring-brand-accent",
        )}
      >
        <span className="truncate text-muted-foreground">{category}</span>
        {pointsLabel}
      </button>
    );
  };

  const fields = (
    <>
      {UPPER.map(field)}
      <div className="my-1 w-full rounded-md bg-white px-3 py-2 dark:bg-card">
        <div className="flex items-center justify-center gap-2 font-bold">
          <span>
            {upperSum}
            {!bonusReached && (
              <span className="text-xs font-normal text-muted-foreground">/{upperBonusThreshold}</span>
            )}
          </span>
          {bonusReached && <Badge className="bg-green-800 font-bold">+{upperBonus}</Badge>}
        </div>
        <Progress
          value={(upperSum / upperBonusThreshold) * 100}
          className="mt-2"
          indicatorClassName={
            bonusReached ? "bg-green-800 dark:bg-green-700" : "bg-green-700 dark:bg-green-400"
          }
        />
      </div>
      {CATEGORIES.slice(6).map(field)}
    </>
  );

  if (bare) return <div className="flex flex-col gap-2">{fields}</div>;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="mb-1 flex w-full items-center rounded-md bg-white px-3 py-1.5 font-bold dark:bg-card">
        {QUIZ_EMOJI} Deine Karte
      </div>
      {fields}
    </Card>
  );
}
