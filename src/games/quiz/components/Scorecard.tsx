import { EmojiText } from "@/components/emoji/Emoji";
import { X } from "lucide-react";

import { Card } from "@/components/ui/card";
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
  /** Extra-Wunder bonus already earned; the 5er-Pasch field shows it on top of its 50. */
  wunderBonus?: number;
  /** Extra-Wunder bonus the current dice would earn, previewed in the 5er-Pasch field. */
  wunderPending?: number;
  className?: string;
};

const UPPER = CATEGORIES.slice(0, 6);

// The ScoreField states of the design system (wk-field, wk.css). Exported for
// the intro's preview of the card and the speedrun.
export const pill = "flex w-full items-center justify-between gap-2 rounded-full border border-border-strong px-4 py-1.5 text-base transition-colors";
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
  wunderBonus = 0,
  wunderPending = 0,
  className,
}: ScorecardProps) {
  const label = split ? shortCategoryLabel : categoryLabel;
  const { upperBonusThreshold, upperBonus } = tournamentRules;
  const upperSum = UPPER.reduce((sum, c) => sum + (card[c] ?? 0), 0);
  const bonusReached = upperSum >= upperBonusThreshold;

  // One field: the name always left, the number right (design system: ScoreField).
  const sizing = split ? "md:min-h-12 md:px-5 md:text-lg" : "";
  const field = (category: Category) => {
    const filled = card[category];
    if (filled !== undefined) {
      const wunder = category === "Wunder";
      const shown = wunder && filled > 0 ? filled + wunderBonus : filled;
      return (
        <div key={category} className={cn("wk-field", filled === 0 ? "is-crossed" : "is-filled", sizing)}>
          <span className="wk-field-label">{label(category)}</span>
          <span className="wk-field-value">
            {shown === 0 ? <X className="size-4" aria-label="gestrichen" /> : shown}
            {wunder && wunderPending > 0 && (
              <span className="ml-1.5 text-brand-accent">+{wunderPending}</span>
            )}
          </span>
        </div>
      );
    }
    const points = options.get(category);
    const value = points !== undefined && (
      <span className="wk-field-value">
        {points > 0 ? `+${points}` : <X className="size-4" aria-label="würde streichen" />}
      </span>
    );
    const state = points === undefined ? "" : points > 0 ? "is-option" : "is-zero";
    if (!onSelect) {
      return (
        <div key={category} className={cn("wk-field", state, sizing)} aria-current={selected === category}>
          <span className="wk-field-label">{label(category)}</span>
          {value}
        </div>
      );
    }
    const allowed = points !== undefined;
    return (
      <button
        key={category}
        type="button"
        disabled={!allowed && Boolean(onSelect) && options.size > 0}
        aria-pressed={selected === category}
        onClick={() => allowed && onSelect(category)}
        className={cn("wk-field", state, sizing)}
      >
        <span className="wk-field-label">{label(category)}</span>
        {value}
      </button>
    );
  };

  const bonus = (
    <div className="wk-bonus md:pt-2">
      <div className="wk-bonus-row">
        <span>Bonus</span>
        {bonusReached ? (
          <Badge>+{upperBonus}</Badge>
        ) : (
          <span className="wk-num">
            {upperSum}
            <small>/{upperBonusThreshold}</small>
          </span>
        )}
      </div>
      <div
        className="wk-progress"
        role="progressbar"
        aria-valuenow={upperSum}
        aria-valuemax={upperBonusThreshold}
        aria-label="Bonus"
      >
        <i style={{ width: `${Math.min(100, (upperSum / upperBonusThreshold) * 100)}%` }} />
      </div>
    </div>
  );

  if (split) {
    return (
      <div className={cn("wk-scorecard md:gap-4 md:p-4", className)}>
        <div className="wk-scorecard-col md:gap-2.5">
          {UPPER.map(field)}
          {bonus}
        </div>
        <div className="wk-scorecard-col md:gap-2.5">{CATEGORIES.slice(6).map(field)}</div>
      </div>
    );
  }

  const fields = (
    <>
      {UPPER.map(field)}
      {bonus}
      {CATEGORIES.slice(6).map(field)}
    </>
  );

  if (bare) return <div className="flex flex-col gap-1.5">{fields}</div>;
  return (
    <Card className="flex flex-col gap-1.5 p-4">
      <h3 className="wk-card-title mb-1">
        <EmojiText text={title} />
      </h3>
      {fields}
    </Card>
  );
}
