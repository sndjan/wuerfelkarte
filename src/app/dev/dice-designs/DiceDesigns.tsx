"use client";

import { Check, ChevronUp, Dices, Lightbulb } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Die } from "@/games/quiz/components/Die";
import { categoryLabel } from "@/games/quiz/feedback";
import type { QuizCard } from "@/games/quiz/types";
import { VerdictBadge } from "@/games/training/components/MoveFeedback";
import { CATEGORIES, scoreCategory, tournamentRules, type Category } from "@/games/yatzy/solver";

/*
 * Design drafts for the Training and Quiz turn screen. Everything here is
 * mocked — random dice, a fake verdict — so the layouts can be compared
 * without the solver. Open /dev/dice-designs?v=a … ?v=d.
 */

const UPPER = CATEGORIES.slice(0, 6);
const LOWER = CATEGORIES.slice(6);

const SHORT: Partial<Record<Category, string>> = {
  Dreierpasch: "3er-Pasch",
  Viererpasch: "4er-Pasch",
  "Kleine Straße": "Kl. Straße",
  "Große Straße": "Gr. Straße",
};
const shortLabel = (c: Category) => SHORT[c] ?? categoryLabel(c);

const START_CARD: QuizCard = { Einser: 3, Dreier: 9, Sechser: 24, "Full House": 25, Wunder: 0 };
const roll = () => 1 + Math.floor(Math.random() * 6);

type Feedback = { loss: number; better: string | null };
const FAKE_FEEDBACK: Feedback[] = [
  { loss: 0, better: null },
  { loss: 0.6, better: "6 6 halten" },
  { loss: 4.2, better: "Chance (23)" },
  { loss: 0, better: null },
];

/** A whole fake turn: dice, held dice, rolls left, the card and a verdict. */
function useMockTurn() {
  const [card, setCard] = useState<QuizCard>(START_CARD);
  const [dice, setDice] = useState([6, 6, 3, 5, 6]);
  const [held, setHeld] = useState([true, true, false, false, true]);
  const [rollsLeft, setRollsLeft] = useState(1);
  const [selected, setSelected] = useState<Category | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(FAKE_FEEDBACK[1]);
  const [n, setN] = useState(0);

  const next = () => {
    setN((x) => x + 1);
    setFeedback(FAKE_FEEDBACK[(n + 2) % FAKE_FEEDBACK.length]);
  };

  const options = new Map<Category, number>(
    CATEGORIES.filter((c) => card[c] === undefined).map((c) => [c, scoreCategory(dice, c)]),
  );
  const turn = CATEGORIES.filter((c) => card[c] !== undefined).length + 1;
  const upper = UPPER.reduce((s, c) => s + (card[c] ?? 0), 0);
  const total =
    CATEGORIES.reduce((s, c) => s + (card[c] ?? 0), 0) +
    (upper >= tournamentRules.upperBonusThreshold ? tournamentRules.upperBonus : 0);

  return {
    card,
    dice,
    held,
    rollsLeft,
    selected,
    feedback,
    options,
    turn,
    upper,
    total,
    canRoll: rollsLeft > 0 && held.some((h) => !h),
    toggle: (i: number) => rollsLeft > 0 && setHeld((h) => h.map((x, j) => (j === i ? !x : x))),
    roll: () => {
      setDice((d) => d.map((v, i) => (held[i] ? v : roll())));
      setRollsLeft((r) => r - 1);
      setSelected(null);
      next();
    },
    select: (c: Category) => setSelected((s) => (s === c ? null : c)),
    score: (c: Category) => {
      setCard((card) => ({ ...card, [c]: scoreCategory(dice, c) }));
      setDice([roll(), roll(), roll(), roll(), roll()]);
      setHeld([false, false, false, false, false]);
      setRollsLeft(2);
      setSelected(null);
      next();
    },
  };
}
type Turn = ReturnType<typeof useMockTurn>;

/* ------------------------------------------------------------------ parts */

/** Remaining rolls as three dots instead of words. */
function RollDots({ left, className }: { left: number; className?: string }) {
  return (
    <span className={cn("flex gap-1", className)} aria-label={`Noch ${left} Würfe`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("size-1.5 rounded-full", i < left ? "bg-current" : "bg-current opacity-25")}
        />
      ))}
    </span>
  );
}

function DiceRow({ t, size = "md" }: { t: Turn; size?: "sm" | "md" }) {
  return (
    <div className={cn("grid grid-cols-5 justify-items-center", size === "sm" ? "gap-1.5" : "gap-2")}>
      {t.dice.map((v, i) => (
        <div key={i} className={cn("w-full", size === "sm" ? "max-w-11" : "max-w-14")}>
          <Die value={v} held={t.held[i]} onToggle={t.rollsLeft > 0 ? () => t.toggle(i) : undefined} />
        </div>
      ))}
    </div>
  );
}

/** One line of verdict: a badge, and the better move only when there is one. */
function VerdictLine({ f, className }: { f: Feedback | null; className?: string }) {
  if (!f) return null;
  return (
    <div className={cn("flex min-w-0 items-center gap-2 text-sm", className)}>
      <VerdictBadge loss={f.loss} />
      {f.better ? (
        <span className="truncate text-muted-foreground">
          besser: <b className="text-foreground">{f.better}</b>
        </span>
      ) : (
        <Check className="size-4 text-brand-accent" />
      )}
    </div>
  );
}

const pillBase =
  "flex w-full items-center justify-between gap-2 rounded-full border border-input px-3 shadow-xs transition-colors";

/**
 * The scorecard in a denser cut: smaller pills, short names, the upper bonus
 * as a slim bar. `columns` 2 splits it into upper and lower half side by side.
 * `confirm` turns the second tap on a selected field into the entry.
 */
function CompactCard({
  t,
  columns = 1,
  dense = false,
  confirm = false,
}: {
  t: Turn;
  columns?: 1 | 2;
  dense?: boolean;
  confirm?: boolean;
}) {
  const h = dense ? "h-8 text-sm" : "h-9 text-[15px]";
  const field = (c: Category) => {
    const filled = t.card[c];
    if (filled !== undefined) {
      return (
        <div
          key={c}
          className={cn(
            pillBase,
            h,
            filled === 0 ? "bg-red-100 dark:bg-[#950606]" : "bg-gray-100 dark:bg-[#2f2f2f]",
          )}
        >
          <span className="truncate text-xs text-muted-foreground">{shortLabel(c)}</span>
          <span className="font-semibold tabular-nums">{filled === 0 ? "✕" : filled}</span>
        </div>
      );
    }
    const pts = t.options.get(c) ?? 0;
    const isSel = t.selected === c;
    return (
      <button
        key={c}
        type="button"
        onClick={() => (confirm && isSel ? t.score(c) : t.select(c))}
        className={cn(
          pillBase,
          h,
          "bg-white text-left hover:bg-gray-50 dark:bg-[#212121] dark:hover:bg-[#2a2a2a]",
          isSel && "border-brand-accent ring-2 ring-brand-accent",
          confirm && isSel && "bg-brand-accent text-white hover:bg-brand-accent dark:bg-brand-accent",
        )}
      >
        <span className={cn("truncate", !(confirm && isSel) && "text-muted-foreground")}>
          {shortLabel(c)}
        </span>
        {confirm && isSel ? (
          <span className="flex items-center gap-1 font-bold tabular-nums">
            {pts > 0 ? `+${pts}` : "✕"} <Check className="size-4" />
          </span>
        ) : (
          <span
            className={cn(
              "font-bold tabular-nums",
              pts > 0 ? "text-brand-accent" : "text-muted-foreground/60",
            )}
          >
            {pts > 0 ? `+${pts}` : "✕"}
          </span>
        )}
      </button>
    );
  };

  const { upperBonusThreshold: goal, upperBonus } = tournamentRules;
  const bonus = (
    <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-green-700 dark:bg-green-400"
          style={{ width: `${Math.min(100, (t.upper / goal) * 100)}%` }}
        />
      </div>
      <span className="tabular-nums">
        {t.upper}/{goal}
        {t.upper >= goal && <b className="ml-1 text-green-700">+{upperBonus}</b>}
      </span>
    </div>
  );

  const gap = dense ? "gap-1" : "gap-1.5";
  if (columns === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("flex flex-col", gap)}>
          {UPPER.map(field)}
          <div className="mt-1">{bonus}</div>
        </div>
        <div className={cn("flex flex-col", gap)}>{LOWER.map(field)}</div>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col", gap)}>
      {UPPER.map(field)}
      <div className="py-1">{bonus}</div>
      {LOWER.map(field)}
    </div>
  );
}

/** Turn and score, one line, for the top of every draft. */
function StatusLine({ t, className }: { t: Turn; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between text-sm", className)}>
      <span className="font-bold">
        Zug {t.turn}
        <span className="font-normal text-muted-foreground">/13</span>
      </span>
      <span className="rounded-full bg-muted px-2.5 py-0.5 font-bold tabular-nums">{t.total} Pkt.</span>
    </div>
  );
}

/** One primary button that rolls, or — once a field is picked — enters it. */
function ActionButton({ t }: { t: Turn }) {
  if (t.selected) {
    const pts = t.options.get(t.selected) ?? 0;
    return (
      <Button className="h-11 flex-1" onClick={() => t.score(t.selected!)}>
        <Check />
        {shortLabel(t.selected)} {pts > 0 ? `+${pts}` : "streichen"}
      </Button>
    );
  }
  return (
    <Button className="h-11 flex-1" disabled={!t.canRoll} onClick={t.roll}>
      <Dices />
      Würfeln
      <RollDots left={t.rollsLeft} className="ml-1" />
    </Button>
  );
}

function HintButton() {
  const [open, setOpen] = useState(false);
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-11 shrink-0"
      aria-label="Tipp"
      onClick={() => setOpen((o) => !o)}
    >
      {open ? <span className="text-xs font-bold">6 6 6</span> : <Lightbulb />}
    </Button>
  );
}

/* ---------------------------------------------------------------- drafts */

/** A: card on top, a fixed dice bar at the bottom — thumb zone. */
function DraftA({ t }: { t: Turn }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-52">
        <StatusLine t={t} className="py-2" />
        <CompactCard t={t} dense />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 rounded-t-2xl border-t bg-background/95 px-4 pt-3 pb-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
        <VerdictLine f={t.feedback} />
        <DiceRow t={t} />
        <div className="flex gap-2">
          <HintButton />
          <ActionButton t={t} />
        </div>
      </div>
    </>
  );
}

/** B: a slim dice bar stuck under the header, the card scrolls below it. */
function DraftB({ t }: { t: Turn }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-background/95 px-4 pt-1 pb-3 backdrop-blur">
        <StatusLine t={t} />
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DiceRow t={t} size="sm" />
          </div>
          <Button
            size="icon"
            className="size-11 shrink-0 flex-col gap-0.5"
            disabled={!t.canRoll}
            onClick={t.roll}
            aria-label="Würfeln"
          >
            <Dices />
            <RollDots left={t.rollsLeft} />
          </Button>
        </div>
        <VerdictLine f={t.feedback} />
      </div>
      <div className="px-4 pt-3 pb-6">
        <CompactCard t={t} confirm />
        <p className="pt-3 text-center text-xs text-muted-foreground">Feld 2× tippen = eintragen</p>
      </div>
    </div>
  );
}

/** C: the card in two columns, so everything fits — no scrolling at all. */
function DraftC({ t }: { t: Turn }) {
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
      <StatusLine t={t} className="pt-2" />
      <CompactCard t={t} columns={2} />
      <div className="mt-auto flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm">
        <VerdictLine f={t.feedback} />
        <DiceRow t={t} />
        <div className="flex gap-2">
          <HintButton />
          <ActionButton t={t} />
        </div>
      </div>
    </div>
  );
}

/** D: a floating overlay over the card that folds down to just the dice. */
function DraftD({ t }: { t: Turn }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-48">
        <StatusLine t={t} className="py-2" />
        <CompactCard t={t} confirm />
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3">
        <div
          className={cn(
            "pointer-events-auto flex flex-col gap-2 rounded-3xl border p-3 shadow-xl backdrop-blur-md",
            "bg-white/85 dark:bg-[#1b1b1b]/85",
            t.feedback && t.feedback.loss > 0 ? "border-orange-400/60" : "border-brand-accent/50",
          )}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-between gap-2"
            aria-label={open ? "Einklappen" : "Ausklappen"}
          >
            <VerdictLine f={t.feedback} />
            <ChevronUp
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "rotate-180")}
            />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <DiceRow t={t} size="sm" />
            </div>
            <Button
              className="h-11 shrink-0 rounded-full px-4"
              disabled={!t.canRoll}
              onClick={t.roll}
              aria-label="Würfeln"
            >
              <Dices />
              <RollDots left={t.rollsLeft} />
            </Button>
          </div>
          {open && t.feedback?.better && (
            <ol className="flex flex-col gap-1 border-t pt-2 text-xs">
              <li className="flex justify-between">
                <span>1. {t.feedback.better}</span>
                <span className="text-muted-foreground">beste</span>
              </li>
              <li className="flex justify-between font-semibold text-brand-accent">
                <span>2. Dein Zug</span>
                <span>−{t.feedback.loss.toFixed(1).replace(".", ",")}</span>
              </li>
            </ol>
          )}
        </div>
      </div>
    </>
  );
}

const DRAFTS = {
  a: { name: "A · Leiste unten", note: "Karte oben, feste Würfelleiste im Daumenbereich. Ein Knopf: würfeln oder eintragen.", C: DraftA },
  b: { name: "B · Leiste oben", note: "Schmale Leiste klebt oben, Karte scrollt darunter. Feld 2× tippen trägt ein.", C: DraftB },
  c: { name: "C · Zwei Spalten", note: "Oben/unten nebeneinander – alles auf einem Blick, kein Scrollen.", C: DraftC },
  d: { name: "D · Schwebendes Overlay", note: "Leiste schwebt über der Karte, Details klappen auf. Feld 2× tippen trägt ein.", C: DraftD },
} as const;
type DraftId = keyof typeof DRAFTS;

function Phone({ id }: { id: DraftId }) {
  const t = useMockTurn();
  const { name, note, C } = DRAFTS[id];
  return (
    <figure className="flex w-[390px] shrink-0 flex-col gap-2">
      <div
        data-draft={id}
        className="relative flex h-[780px] flex-col overflow-hidden rounded-[2rem] border-4 border-foreground/10 bg-background"
      >
        <div className="flex items-center px-4 pt-4 pb-1 text-xl font-extrabold tracking-tight">
          ← Kniffel-Training
        </div>
        <C t={t} />
      </div>
      <figcaption className="px-2">
        <b>{name}</b>
        <p className="text-sm text-muted-foreground">{note}</p>
      </figcaption>
    </figure>
  );
}

function Drafts() {
  const v = useSearchParams().get("v");
  const ids = (v && v in DRAFTS ? [v] : Object.keys(DRAFTS)) as DraftId[];
  return (
    <div className="flex flex-wrap justify-center gap-8 p-6">
      {ids.map((id) => (
        <Phone key={id} id={id} />
      ))}
    </div>
  );
}

export function DiceDesigns() {
  return (
    <Suspense>
      <Drafts />
    </Suspense>
  );
}
