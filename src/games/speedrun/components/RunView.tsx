"use client";

import { Dices, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CATEGORIES, tournamentRules, type Category, type Solver } from "@/games/yatzy/solver";
import { shortCategoryLabel } from "@/games/quiz/feedback";
import { toTurnState } from "@/games/quiz/puzzles";
import { Die } from "@/games/quiz/components/Die";
import { crossedPill, filledPill, openPill, pill } from "@/games/quiz/components/Scorecard";
import { CATEGORY_LABELS, formatDelta, formatSeconds, formatTime } from "../config";
import { goldSegments, personalBest, splitMark, type SplitMark } from "../records";
import { TURNS, elapsedMs, splits, strafeMs, totalScore } from "../run";
import type { SpeedrunGame, StoredSpeedrunMatch } from "../types";

/** Physical keys (KeyboardEvent.code) per field — QWERTZ row, then ASDF row. */
const FIELD_KEYS: Record<string, Category> = Object.fromEntries(
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ"].map(
    (code, i) => [code, CATEGORIES[i]],
  ),
);
const FIELD_HINTS: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c, i) => [c, "QWERTZASDFGHJ"[i]]),
) as Record<Category, string>;

const MARK_COLORS: Record<SplitMark, string> = {
  gold: "bg-gold",
  ahead: "bg-brand-accent",
  behind: "bg-orange-500",
  none: "bg-primary-foreground/70",
};

/** Clock and delta to the personal best, re-rendered every frame on their own. */
function LiveClock({
  game,
  strafe,
  pbSplits,
}: {
  game: SpeedrunGame;
  strafe: number;
  pbSplits: number[] | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const elapsed = elapsedMs(game, now);
  const reference = pbSplits?.[Math.min(game.turns.length, TURNS - 1)];
  const delta = reference !== undefined ? elapsed + strafe - reference : null;

  return (
    <>
      <span
        className="text-5xl leading-none font-extrabold tabular-nums"
        style={{ fontFamily: "var(--font-baloo)" }}
        role="timer"
        aria-label="Zeit"
      >
        {formatTime(elapsed)}
      </span>
      {delta !== null && (
        <span
          className={cn(
            "ml-auto self-start rounded-full px-2.5 py-0.5 text-lg font-extrabold tabular-nums text-white",
            delta < 0 ? "bg-brand-accent" : "bg-orange-500",
          )}
          style={{ fontFamily: "var(--font-baloo)" }}
          title="Abstand zur Bestzeit, inklusive Strafe"
        >
          {formatDelta(delta)}
        </span>
      )}
    </>
  );
}

type RunViewProps = {
  solver: Solver;
  game: SpeedrunGame;
  matches: StoredSpeedrunMatch[];
  /** Show the key for every field and die — once a keyboard was used. */
  showKeys: boolean;
  onKeyboard: () => void;
  onRoll: () => void;
  onKeep: (held: boolean[]) => void;
  onScore: (category: Category) => void;
  onAbort: () => void;
};

/**
 * One decision of a run: the clock band, the card and the dice. Keyed by
 * decision, so the held dice and the roll animation start fresh each time.
 * Tapping a field enters it at once — no selection, no confirmation.
 */
export function RunView({
  solver,
  game,
  matches,
  showKeys,
  onKeyboard,
  onRoll,
  onKeep,
  onScore,
  onAbort,
}: RunViewProps) {
  const { current } = game;
  const [held, setHeld] = useState<boolean[]>(() => [...current.held]);

  const pb = useMemo(() => personalBest(matches, game.category), [matches, game.category]);
  const gold = useMemo(() => goldSegments(matches, game.category), [matches, game.category]);
  const runSplits = splits(game);
  const strafe = strafeMs(game);
  const counted = game.category !== "any";

  const options = useMemo(() => {
    if (!current.rolled) return new Map<Category, number>();
    const entries = solver.analyze(toTurnState(game.card), current.dice, 0);
    return new Map(
      entries.flatMap((o) => (o.kind === "score" ? [[o.category, o.points] as const] : [])),
    );
  }, [solver, game.card, current.dice, current.rolled]);

  // The dice the last roll threw: all of them on the turn's first roll.
  const lastStep = current.steps.at(-1);
  const fresh = lastStep?.kind === "keep" ? current.held.map((h) => !h) : current.dice.map(() => true);

  const canRoll = !current.rolled || (current.rollsLeft > 0 && held.some((h) => !h));
  const roll = () => {
    if (!canRoll) return;
    if (current.rolled) onKeep(held);
    else onRoll();
  };
  const toggle = (i: number) => {
    if (!current.rolled || current.rollsLeft === 0) return;
    setHeld((prev) => prev.map((h, j) => (j === i ? !h : h)));
  };
  const pick = (category: Category) => {
    if (options.has(category)) onScore(category);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest("input, textarea, [role=dialog]")) return;
      const die = /^(?:Digit|Numpad)([1-5])$/.exec(event.code);
      let handled = true;
      if (die) toggle(Number(die[1]) - 1);
      else if (event.code === "Space") roll();
      else if (event.code === "Escape") onAbort();
      else if (FIELD_KEYS[event.code]) pick(FIELD_KEYS[event.code]);
      else handled = false;
      if (handled) {
        event.preventDefault();
        onKeyboard();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const upperSum = CATEGORIES.slice(0, 6).reduce((sum, c) => sum + (game.card[c] ?? 0), 0);
  const rolls = current.rolled ? current.rollsLeft : current.rollsLeft + 1;
  const noRolls = current.rolled && current.rollsLeft === 0;

  const field = (category: Category) => {
    const filled = game.card[category];
    const points = options.get(category);
    const hint = showKeys && (
      <kbd className="flex size-5 shrink-0 items-center justify-center rounded border border-b-2 border-input bg-white text-[11px] font-extrabold text-muted-foreground dark:bg-card">
        {FIELD_HINTS[category]}
      </kbd>
    );
    if (filled !== undefined) {
      return (
        <div key={category} className={cn(pill, "px-3 py-1 text-[15px]", filled === 0 ? crossedPill : filledPill)}>
          <span className="truncate text-xs text-muted-foreground">{shortCategoryLabel(category)}</span>
          <span className="font-bold tabular-nums">{filled === 0 ? "❌" : filled}</span>
        </div>
      );
    }
    const allowed = points !== undefined;
    return (
      <button
        key={category}
        type="button"
        disabled={!allowed}
        onClick={() => pick(category)}
        className={cn(
          pill,
          openPill,
          "px-3 py-1 text-left text-[15px] disabled:cursor-not-allowed disabled:opacity-50",
          allowed && points > 0 && "border-brand-accent",
        )}
      >
        {hint}
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{shortCategoryLabel(category)}</span>
        {allowed && (
          <span className={cn("shrink-0 font-bold tabular-nums", points > 0 ? "text-brand-accent" : "text-muted-foreground")}>
            {points > 0 ? `+${points}` : "❌"}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-2.5 rounded-b-3xl bg-primary px-4 pt-3 pb-3.5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Lauf abbrechen"
            onClick={onAbort}
            className="size-11 shrink-0 rounded-full border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <X className="size-5" />
          </Button>
          <LiveClock game={game} strafe={strafe} pbSplits={pb?.splits ?? null} />
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-foreground/75">
          <span>
            {CATEGORY_LABELS[game.category]} · Zug {Math.min(game.turns.length + 1, TURNS)} von {TURNS}
          </span>
          {game.category === "daily" && !game.ranked && (
            <span className="rounded-full bg-primary-foreground/15 px-2 text-xs font-bold">Übung</span>
          )}
          {counted && (
            <span className="ml-auto font-bold tabular-nums text-orange-300 dark:text-orange-700">
              Strafe +{formatSeconds(strafe)} s
            </span>
          )}
        </div>
        <div className="grid grid-cols-13 gap-[3px]" aria-hidden="true">
          {Array.from({ length: TURNS }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full",
                i < runSplits.length
                  ? MARK_COLORS[splitMark(runSplits, i, pb, gold)]
                  : i === runSplits.length
                    ? "bg-primary-foreground/50"
                    : "bg-primary-foreground/15",
              )}
            />
          ))}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2.5 px-3 pt-3">
        <Card className="grid grid-cols-2 gap-2 p-2.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            {CATEGORIES.slice(0, 6).map(field)}
            <div className="flex items-center justify-between rounded-full bg-muted px-3 py-1 text-sm font-bold">
              <span>Bonus</span>
              <span className="tabular-nums">
                {upperSum >= tournamentRules.upperBonusThreshold ? (
                  <span className="text-brand-accent">+{tournamentRules.upperBonus}</span>
                ) : (
                  <>
                    {upperSum}
                    <span className="font-normal text-muted-foreground">/{tournamentRules.upperBonusThreshold}</span>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">{CATEGORIES.slice(6).map(field)}</div>
        </Card>
        <p className="px-1 text-right text-xs text-muted-foreground">
          Karte {totalScore(game)} Punkte{counted && " · zählen nicht"}
        </p>

        <div className="sticky bottom-0 z-10 mt-auto pb-3">
          <Card className="gap-3 p-3">
            <div className="grid grid-cols-5 justify-items-center gap-2">
              {current.dice.map((value, i) => (
                <div key={i} className="relative flex w-full justify-center">
                  <span
                    className={cn(
                      "flex w-full justify-center",
                      current.rolled && fresh[i] && "animate-in zoom-in-75 fade-in duration-150 motion-reduce:animate-none",
                    )}
                  >
                    <Die
                      value={current.rolled ? value : undefined}
                      held={held[i]}
                      onToggle={current.rolled && current.rollsLeft > 0 ? () => toggle(i) : undefined}
                    />
                  </span>
                  {showKeys && current.rolled && current.rollsLeft > 0 && (
                    <kbd className="absolute -bottom-2 rounded border border-b-2 border-input bg-white px-1 text-[10px] font-extrabold text-muted-foreground dark:bg-card">
                      {i + 1}
                    </kbd>
                  )}
                </div>
              ))}
            </div>
            <Button
              className="h-12 text-base"
              disabled={!canRoll}
              onClick={roll}
              aria-label={noRolls ? "Feld wählen" : `Würfeln, noch ${rolls} ${rolls === 1 ? "Wurf" : "Würfe"}`}
            >
              <Dices className="size-5" />
              {noRolls ? "Feld wählen" : "Würfeln"}
              {!noRolls && (
                <span className="ml-0.5 flex gap-1" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={cn("size-1.5 rounded-full bg-current", i >= rolls && "opacity-30")} />
                  ))}
                </span>
              )}
              {showKeys && canRoll && (
                <kbd className="ml-2 rounded border border-b-2 border-primary-foreground/40 px-1.5 text-xs">Leertaste</kbd>
              )}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
