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
import { CATEGORY_LABELS, SPEEDRUN_NAME, formatDelta, formatSeconds, formatTime } from "../config";
import { goldSegments, personalBest, splitMark, sumOfBest, type SplitMark } from "../records";
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

/** The same marks as text on the dark band (which turns light in dark mode). */
const MARK_TEXT: Record<SplitMark, string> = {
  gold: "text-gold dark:text-yellow-700",
  ahead: "text-[#6FD39C] dark:text-brand-accent",
  behind: "text-orange-300 dark:text-orange-700",
  none: "text-primary-foreground/70",
};

/** Ticks every frame, so only the components using it re-render. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return now;
}

type ClockProps = {
  game: SpeedrunGame;
  strafe: number;
  pbSplits: number[] | null;
  /** Mobile: clock and delta pill in one row. Desktop: a big clock above its delta. */
  variant: "compact" | "large";
  caption?: string;
};

/** Clock and delta to the personal best (penalty included), live. */
function LiveClock({ game, strafe, pbSplits, variant, caption }: ClockProps) {
  const now = useNow();
  const elapsed = elapsedMs(game, now);
  const reference = pbSplits?.[Math.min(game.turns.length, TURNS - 1)];
  const delta = reference !== undefined ? elapsed + strafe - reference : null;
  const clock = (
    <span
      className={cn(
        "leading-none font-extrabold tabular-nums",
        variant === "compact" ? "text-5xl" : "text-[88px] tracking-tight",
      )}
      style={{ fontFamily: "var(--font-baloo)" }}
      role="timer"
      aria-label="Zeit"
    >
      {formatTime(elapsed)}
    </span>
  );

  if (variant === "compact") {
    return (
      <>
        {clock}
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

  return (
    <div className="flex flex-col gap-1">
      {clock}
      <div className="flex items-baseline gap-3">
        {delta !== null && (
          <span
            className={cn("text-3xl font-extrabold tabular-nums", MARK_TEXT[delta < 0 ? "ahead" : "behind"])}
            style={{ fontFamily: "var(--font-baloo)" }}
          >
            {formatDelta(delta)}
          </span>
        )}
        <span className="text-sm text-primary-foreground/70">{caption}</span>
      </div>
    </div>
  );
}

function Key({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "items-center justify-center rounded-md border border-b-2 border-input bg-white px-1.5 font-sans text-[11px] font-extrabold text-muted-foreground dark:bg-card",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

type RunViewProps = {
  solver: Solver;
  game: SpeedrunGame;
  matches: StoredSpeedrunMatch[];
  /** Show the keys on a phone or tablet too — once a keyboard was used. */
  showKeys: boolean;
  onKeyboard: () => void;
  onRoll: () => void;
  onKeep: (held: boolean[]) => void;
  onScore: (category: Category) => void;
  onAbort: () => void;
};

/**
 * One decision of a run: the clock, the card and the dice. Keyed by
 * decision, so the held dice and the roll animation start fresh each time.
 * Tapping a field enters it at once — no selection, no confirmation.
 *
 * On a phone the clock is a band on top and the dice are docked at the
 * bottom; on a wide screen the clock and the splits get a side panel, and
 * every field and die shows its key.
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
  const turnLabel = `Zug ${Math.min(game.turns.length + 1, TURNS)} von ${TURNS}`;
  // Keys are always shown on a wide screen, elsewhere once a keyboard was used.
  const keyVisibility = showKeys ? "flex" : "hidden lg:flex";

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
  const best = sumOfBest(gold);

  const field = (category: Category) => {
    const filled = game.card[category];
    const points = options.get(category);
    const fieldPill = cn(pill, "px-3 py-1 text-[15px] lg:h-11 lg:gap-3 lg:px-3.5 lg:text-base");
    const hint = (
      <Key className={cn(keyVisibility, "size-6 shrink-0 px-0 lg:size-7 lg:border-b-[3px] lg:text-xs")}>
        {FIELD_HINTS[category]}
      </Key>
    );
    if (filled !== undefined) {
      return (
        <div key={category} className={cn(fieldPill, filled === 0 ? crossedPill : filledPill)}>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground lg:text-sm">
            {shortCategoryLabel(category)}
          </span>
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
          fieldPill,
          openPill,
          "text-left disabled:cursor-not-allowed disabled:opacity-50",
          allowed && points > 0 && "border-brand-accent",
        )}
      >
        {hint}
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{shortCategoryLabel(category)}</span>
        {allowed && (
          <span
            className={cn(
              "shrink-0 font-bold tabular-nums lg:text-lg",
              points > 0 ? "text-brand-accent" : "text-muted-foreground",
            )}
          >
            {points > 0 ? `+${points}` : "❌"}
          </span>
        )}
      </button>
    );
  };

  const abortButton = (
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
  );

  const practice = game.category === "daily" && !game.ranked && (
    <span className="rounded-full bg-primary-foreground/15 px-2 text-xs font-bold">Übung</span>
  );

  const strafeText = `Strafe +${formatSeconds(strafe)} s`;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Phone: the clock band on top. */}
      <header className="sticky top-0 z-20 flex flex-col gap-2.5 rounded-b-3xl bg-primary px-4 pt-3 pb-3.5 text-primary-foreground lg:hidden">
        <div className="flex items-center gap-3">
          {abortButton}
          <LiveClock game={game} strafe={strafe} pbSplits={pb?.splits ?? null} variant="compact" />
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-foreground/75">
          <span>
            {CATEGORY_LABELS[game.category]} · {turnLabel}
          </span>
          {practice}
          {counted && (
            <span className="ml-auto font-bold tabular-nums text-orange-300 dark:text-orange-700">{strafeText}</span>
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

      {/* Wide screen: clock and splits in a side panel. */}
      <aside className="sticky top-0 hidden h-dvh w-[380px] shrink-0 flex-col gap-5 overflow-y-auto bg-primary px-6 py-7 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          {abortButton}
          <span className="flex-1 text-xl font-bold" style={{ fontFamily: "var(--font-baloo)" }}>
            {SPEEDRUN_NAME}
          </span>
          <span className="rounded-full bg-primary-foreground/80 px-2.5 py-0.5 text-xs font-bold text-primary">
            {CATEGORY_LABELS[game.category]}
          </span>
        </div>

        <LiveClock
          game={game}
          strafe={strafe}
          pbSplits={pb?.splits ?? null}
          variant="large"
          caption={`${pb ? "zur Bestzeit · " : ""}${turnLabel}`}
        />
        {(counted || practice) && (
          <div className="-mt-2 flex items-center gap-2 text-sm">
            {counted && (
              <span className="font-bold tabular-nums text-orange-300 dark:text-orange-700">{strafeText}</span>
            )}
            {practice}
          </div>
        )}

        <ol className="flex flex-col border-t border-primary-foreground/15 pt-1" aria-label="Splits">
          {Array.from({ length: TURNS }, (_, i) => {
            const done = i < runSplits.length;
            const now = i === runSplits.length;
            const mark = done ? splitMark(runSplits, i, pb, gold) : "none";
            return (
              <li
                key={i}
                className={cn(
                  "flex h-[30px] items-center gap-2.5 rounded-md px-2 tabular-nums",
                  now && "bg-primary-foreground/10",
                )}
              >
                <span className="w-5 text-right text-xs text-primary-foreground/60">{i + 1}</span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm font-semibold",
                    !done && "text-primary-foreground/60",
                  )}
                >
                  {done ? shortCategoryLabel(game.turns[i].category) : now ? "läuft …" : ""}
                </span>
                <span className={cn("w-14 text-right text-sm font-extrabold", MARK_TEXT[mark])}>
                  {done && pb ? formatDelta(runSplits[i] - pb.splits[i]) : ""}
                </span>
                <span
                  className={cn("w-16 text-right text-sm font-bold", !done && "text-primary-foreground/50")}
                >
                  {done ? formatTime(runSplits[i]) : pb ? formatTime(pb.splits[i]) : ""}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-auto flex justify-between gap-3 text-xs text-primary-foreground/70">
          <span>Bestzeit {pb ? formatTime(pb.wertungMs) : "–"}</span>
          <span>Summe Bestsplits {best !== null ? formatTime(best) : "–"}</span>
        </div>
      </aside>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2.5 px-3 pt-3 lg:max-w-3xl lg:gap-5 lg:px-10 lg:pt-7">
        <div className="hidden items-center gap-4 lg:flex">
          <h2 className="flex-1 text-2xl font-bold">Karte</h2>
          <span className="text-sm text-muted-foreground">
            Karte {totalScore(game)} P.{counted && " · zählt nicht"}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Key className="flex h-6">Esc</Key> abbrechen
          </span>
        </div>

        <Card className="grid grid-cols-2 gap-2 p-2.5 lg:gap-4 lg:p-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            {CATEGORIES.slice(0, 6).map(field)}
            <div className="flex items-center justify-between rounded-full bg-muted px-3 py-1 text-sm font-bold lg:h-11 lg:px-3.5 lg:text-base">
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
        <p className="px-1 text-right text-xs text-muted-foreground lg:hidden">
          Karte {totalScore(game)} Punkte{counted && " · zählen nicht"}
        </p>

        <div className="sticky bottom-0 z-10 mt-auto pb-3 lg:pb-7">
          <Card className="gap-3 p-3 lg:flex-row lg:items-center lg:gap-6 lg:p-5">
            <div className="grid grid-cols-5 justify-items-center gap-2 lg:flex lg:gap-3">
              {current.dice.map((value, i) => (
                <div key={i} className="flex w-full flex-col items-center gap-1.5 lg:w-16">
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
                  <Key className={cn(keyVisibility, current.rolled && current.rollsLeft > 0 ? "" : "invisible")}>
                    {i + 1}
                  </Key>
                </div>
              ))}
            </div>
            <Button
              className="h-12 text-base lg:ml-auto lg:h-16 lg:shrink-0 lg:rounded-full lg:px-6 lg:text-xl"
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
              {canRoll && (
                <kbd
                  className={cn(
                    keyVisibility,
                    "ml-2 rounded-md border border-b-2 border-primary-foreground/40 px-1.5 font-sans text-xs",
                  )}
                >
                  Leertaste
                </kbd>
              )}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
