import {
  CATEGORIES,
  type Category,
  type Solver,
  type TurnOption,
  type TurnState,
} from "@/games/yatzy/solver";
import type {
  PuzzleProgress,
  QuizCard,
  QuizMove,
  QuizPuzzle,
  QuizStep,
  RollsLeft,
  StoredQuizMatch,
} from "./types";

/**
 * The daily quiz, as pure functions: the same date always yields the same
 * three puzzles, and every decision is graded against the optimal solver.
 */

export const PUZZLES_PER_DAY = 3;
/** Points for a puzzle without a single loss; a day is worth three times that. */
export const POINTS_PERFECT = 100;
/**
 * How fast a decision's points fall with the expected points it gives away:
 * 1 → 88, 3 → 69, 5 → 54, 10 → 29, 20 → 8. Gentle on purpose — a near miss
 * should still feel like a good turn.
 */
const POINTS_DECAY = 8;
/** How many of the best moves a step's ranking shows (plus the player's own). */
export const TOP_MOVES = 5;
/**
 * Below this two choices count as equally good: a few hundredths of a point
 * are no fair difference to grade on.
 */
const TIE = 0.05;

const UPPER: readonly Category[] = CATEGORIES.slice(0, 6);

/** The first day the archive offers. */
export const ARCHIVE_START = "2026-10-01";

/** Local date as YYYY-MM-DD — the quiz changes at local midnight. */
export function dateKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Small deterministic PRNG (mulberry32), seeded from a string. */
export function seededRandom(seed: string): () => number {
  let a = 2166136261;
  for (let i = 0; i < seed.length; i++)
    a = Math.imul(a ^ seed.charCodeAt(i), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rollDice = (random: () => number, count = 5) =>
  Array.from({ length: count }, () => 1 + Math.floor(random() * 6));

const sorted = (dice: readonly number[]) => [...dice].sort((a, b) => a - b);

export function toTurnState(card: QuizCard): TurnState {
  const filled = CATEGORIES.filter((c) => card[c] !== undefined);
  return {
    filled,
    upperSum: UPPER.reduce((sum, c) => sum + (card[c] ?? 0), 0),
    wunderScored: (card.Wunder ?? 0) > 0,
  };
}

/** Rerolls every die that is not held, taking faces from `faces` in order. */
export function reroll(
  dice: readonly number[],
  held: readonly boolean[],
  faces: readonly number[],
) {
  let next = 0;
  return dice.map((die, i) => (held[i] ? die : faces[next++]));
}

const sameDice = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && sorted(a).every((d, i) => d === sorted(b)[i]);

/** The option the player chose, its loss against the best and the best one. */
function grade(options: TurnOption[], chosen: TurnOption | undefined) {
  if (!chosen) throw new Error("That choice is not available for these dice");
  const loss = options[0].expected - chosen.expected;
  return { best: options[0], loss: loss < TIE ? 0 : loss };
}

/**
 * Every move for these dice, best first. With rolls left, entering now is
 * listed per field, next to the rerolls. "Keep all five" is left out: it only
 * postpones the same decision and is never better than the best real move.
 */
export function rankMoves(
  solver: Solver,
  card: QuizCard,
  dice: readonly number[],
  rollsLeft: RollsLeft,
): TurnOption[] {
  const state = toTurnState(card);
  const fields = solver.analyze(state, dice, 0);
  if (rollsLeft === 0) return fields;
  const rerolls = solver
    .analyze(state, dice, rollsLeft)
    .filter((o) => o.kind !== "keep" || o.dice.length < 5);
  return [...rerolls, ...fields].sort((a, b) => b.expected - a.expected);
}

/** The top moves plus the chosen one, if it ranks below them. */
function topMoves(
  ranked: TurnOption[],
  isChosen: (o: TurnOption) => boolean,
): QuizMove[] {
  const best = ranked[0].expected;
  const moves = ranked.map((o, i): QuizMove => {
    const loss = best - o.expected;
    const base = {
      loss: loss < TIE ? 0 : loss,
      rank: i + 1,
      chosen: isChosen(o),
    };
    return o.kind === "keep"
      ? { ...base, kind: "keep", dice: o.dice }
      : { ...base, kind: "score", category: o.category, points: o.points };
  });
  const top = moves.slice(0, TOP_MOVES);
  const own = moves.find((m) => m.chosen);
  return own && own.rank > TOP_MOVES ? [...top, own] : top;
}

/** Grades one move against the full ranking of this decision. */
function gradeMove(
  solver: Solver,
  card: QuizCard,
  dice: readonly number[],
  rollsLeft: RollsLeft,
  isChosen: (o: TurnOption) => boolean,
) {
  const ranked = rankMoves(solver, card, dice, rollsLeft);
  const { best, loss } = grade(ranked, ranked.find(isChosen));
  return { ranked, best, loss, moves: topMoves(ranked, isChosen) };
}

export function gradeKeep(
  solver: Solver,
  card: QuizCard,
  dice: readonly number[],
  rollsLeft: 1 | 2,
  kept: readonly number[],
): Extract<QuizStep, { kind: "keep" }> {
  const { best, loss, moves } = gradeMove(
    solver,
    card,
    dice,
    rollsLeft,
    (o) => o.kind === "keep" && sameDice(o.dice, kept),
  );
  return {
    kind: "keep",
    dice: [...dice],
    rollsLeft,
    kept: sorted(kept),
    best: best.kind === "keep" ? best.dice : [],
    loss,
    moves,
  };
}

/**
 * Entering the dice, possibly with rolls left: graded against rolling on as
 * well as against the other fields.
 */
export function gradeScore(
  solver: Solver,
  card: QuizCard,
  dice: readonly number[],
  rollsLeft: RollsLeft,
  category: Category,
): Extract<QuizStep, { kind: "score" }> {
  const isChosen = (o: TurnOption) =>
    o.kind === "score" && o.category === category;
  const { ranked, best, loss, moves } = gradeMove(
    solver,
    card,
    dice,
    rollsLeft,
    isChosen,
  );
  const chosen = ranked.find(isChosen);
  const bestField = ranked.find((o) => o.kind === "score");
  return {
    kind: "score",
    dice: [...dice],
    rollsLeft,
    category,
    points: chosen?.kind === "score" ? chosen.points : 0,
    best: bestField?.kind === "score" ? bestField.category : category,
    shouldRoll: loss > 0 && best.kind === "keep",
    loss,
    moves,
  };
}

export function puzzleLoss(progress: PuzzleProgress): number {
  return progress.steps.reduce((sum, step) => sum + step.loss, 0);
}

/**
 * The average of the puzzle's decisions, each scored by the expected points
 * it gave away — so one near miss among perfect moves still scores high.
 * Only a loss-free puzzle gets the full 100.
 */
export function puzzlePoints(progress: PuzzleProgress): number {
  const { steps } = progress;
  if (steps.length === 0) return 0;
  const average =
    steps.reduce((sum, step) => sum + stepPoints(step.loss), 0) / steps.length;
  const points = Math.round(average);
  return puzzleLoss(progress) === 0 ? POINTS_PERFECT : Math.min(points, POINTS_PERFECT - 1);
}

/** One decision's points, 0–100, for the expected points it gave away. */
export function stepPoints(loss: number): number {
  return POINTS_PERFECT * Math.exp(-loss / POINTS_DECAY);
}

/** "great" is still worded "Gut", but already green — about 280 a day. */
export type PointsTier = "perfect" | "great" | "good" | "close" | "miss";

export function pointsTier(points: number): PointsTier {
  if (points >= POINTS_PERFECT) return "perfect";
  if (points >= 93) return "great";
  if (points >= 75) return "good";
  return points >= 40 ? "close" : "miss";
}

export function startProgress(puzzle: QuizPuzzle): PuzzleProgress {
  return {
    rolled: false,
    dice: [...puzzle.dice],
    rollsLeft: puzzle.rollsLeft,
    steps: [],
    done: false,
  };
}

/** The turn's first roll: all five dice, nothing to grade. */
export function applyRoll(progress: PuzzleProgress): PuzzleProgress {
  return progress.rolled === false ? { ...progress, rolled: true } : progress;
}

/** Applies a keep decision: grades it and rolls the other dice. */
export function applyKeep(
  solver: Solver,
  puzzle: QuizPuzzle,
  progress: PuzzleProgress,
  held: readonly boolean[],
): PuzzleProgress {
  if (progress.done || progress.rolled === false || progress.rollsLeft === 0)
    return progress;
  const kept = progress.dice.filter((_, i) => held[i]);
  const step = gradeKeep(
    solver,
    puzzle.card,
    progress.dice,
    progress.rollsLeft,
    kept,
  );
  const rollIndex = puzzle.rollsLeft - progress.rollsLeft;
  return {
    ...progress,
    dice: reroll(progress.dice, held, puzzle.nextRolls[rollIndex]),
    rollsLeft: (progress.rollsLeft - 1) as RollsLeft,
    steps: [...progress.steps, step],
  };
}

/** Applies the final decision: grades the chosen field and ends the puzzle. */
export function applyScore(
  solver: Solver,
  puzzle: QuizPuzzle,
  progress: PuzzleProgress,
  category: Category,
): PuzzleProgress {
  if (progress.done || progress.rolled === false) return progress;
  const step = gradeScore(
    solver,
    puzzle.card,
    progress.dice,
    progress.rollsLeft,
    category,
  );
  return { ...progress, steps: [...progress.steps, step], done: true };
}

/**
 * Plays one turn the way a decent player would: usually the best move,
 * sometimes a slightly worse one, so the generated scorecards look lived-in
 * rather than perfect.
 */
function pickPlausible(
  options: TurnOption[],
  random: () => number,
): TurnOption {
  const second = options[1];
  if (second && options[0].expected - second.expected < 3 && random() < 0.25)
    return second;
  return options[0];
}

function playTurn(
  solver: Solver,
  card: QuizCard,
  random: () => number,
): QuizCard {
  const state = toTurnState(card);
  let dice = rollDice(random);
  for (const rollsLeft of [2, 1] as const) {
    const choice = pickPlausible(
      solver.analyze(state, dice, rollsLeft),
      random,
    );
    if (choice.kind !== "keep" || choice.dice.length === 5) break;
    dice = [...choice.dice, ...rollDice(random, 5 - choice.dice.length)];
  }
  const entry = pickPlausible(solver.analyze(state, dice, 0), random);
  return entry.kind === "score"
    ? { ...card, [entry.category]: entry.points }
    : card;
}

/**
 * Worth asking: the best move is clearly best (no coin flip), yet another
 * move is close enough to be tempting.
 */
function isInteresting(options: TurnOption[]): boolean {
  if (options.length < 2) return false;
  const gap = options[0].expected - options[1].expected;
  return gap >= 0.3 && gap <= 6;
}

/** A whole turn on a lived-in card, judged by its first decision. */
function generatePuzzle(solver: Solver, random: () => number): QuizPuzzle {
  let fallback: QuizPuzzle | null = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    // Leave at least three open fields so the last decision is a real choice.
    const turns = Math.floor(random() * 11);
    let card: QuizCard = {};
    for (let t = 0; t < turns; t++) card = playTurn(solver, card, random);

    const dice = rollDice(random);
    const puzzle: QuizPuzzle = {
      card,
      dice,
      rollsLeft: 2,
      nextRolls: [rollDice(random), rollDice(random)],
    };
    if (isInteresting(rankMoves(solver, card, dice, 2))) return puzzle;
    fallback ??= puzzle;
  }
  return fallback!;
}

/** The day's puzzles, each a whole turn: one roll of all five, two rerolls. */
export function generateDailyQuiz(solver: Solver, date: string): QuizPuzzle[] {
  const random = seededRandom(`kniffel-quiz:${date}`);
  return Array.from({ length: PUZZLES_PER_DAY }, () =>
    generatePuzzle(solver, random),
  );
}

/** A real past day the archive offers, from ARCHIVE_START to yesterday. */
export function isArchiveDate(date: string, today: string = dateKey()): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    dateKey(new Date(`${date}T12:00:00`)) === date &&
    date >= ARCHIVE_START &&
    date < today
  );
}

/** The streak counts days played on the day itself, not catch-ups from the archive. */
export function dailyStreak(
  matches: readonly StoredQuizMatch[],
  today: string,
): number {
  return currentStreak(
    matches.filter((m) => m.gamemode !== "archive").map((m) => m.id),
    today,
  );
}

/** Consecutive played days ending today, or yesterday if today is still open. */
export function currentStreak(
  playedDates: readonly string[],
  today: string,
): number {
  const played = new Set(playedDates);
  const day = new Date(`${today}T12:00:00`);
  if (!played.has(today)) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (played.has(dateKey(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}
