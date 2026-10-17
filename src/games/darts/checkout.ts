import {
  BULL_SEGMENT,
  DARTS_PER_TURN,
  dart,
  dartValue,
  satisfiesOut,
} from "./scoring";
import { Dart, DartsOutRule } from "./types";

/**
 * Finish suggestions.
 *
 * Rather than carrying the printed checkout table around, routes are searched
 * for and ranked: the fewest darts wins, and among equally short routes the one
 * whose darts sit in the friendliest places. The ranking lists below are what
 * "friendliest" means — they are what makes 70 come out as T18, D8 instead of
 * the equally valid T20, D5.
 */

/** Highest number that can be checked out at all (T20, T20, Bullseye). */
export const HIGHEST_CHECKOUT = 170;

const dartKey = (d: Dart) => `${d.segment}x${d.multiplier}`;

const triples = (order: number[]) => order.map((segment) => dart(segment, 3));
const doubles = (order: number[]) => order.map((segment) => dart(segment, 2));
const singles = (order: number[]) => order.map((segment) => dart(segment, 1));

const DESCENDING = Array.from({ length: 20 }, (_, i) => 20 - i);

/** Doubles in the order a player would rather be left on, best first. */
const DOUBLE_ORDER = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1];

/** Setup darts, best first: the treble bed, then the big singles, then the rest. */
const PREFIX_DARTS: Dart[] = [
  ...triples(DESCENDING),
  ...singles(DESCENDING),
  dart(BULL_SEGMENT, 2),
  dart(BULL_SEGMENT, 1),
  ...doubles(DOUBLE_ORDER),
];

const FINISH_DARTS: Record<DartsOutRule, Dart[]> = {
  // A double-out finish is a double — the bull counts as the 25-double.
  double: [...doubles(DOUBLE_ORDER), dart(BULL_SEGMENT, 2)],
  // Master-out allows a treble too, but a double is still the better target.
  master: [...doubles(DOUBLE_ORDER), dart(BULL_SEGMENT, 2), ...triples(DESCENDING)],
  // Straight-out: walk out on a single where possible.
  straight: [
    ...singles(DESCENDING),
    dart(BULL_SEGMENT, 1),
    ...doubles(DOUBLE_ORDER),
    dart(BULL_SEGMENT, 2),
    ...triples(DESCENDING),
  ],
};

const PREFIX_RANK = new Map(PREFIX_DARTS.map((d, index) => [dartKey(d), index]));

const finishRanks = (rule: DartsOutRule) =>
  new Map(FINISH_DARTS[rule].map((d, index) => [dartKey(d), index]));

const FINISH_RANK: Record<DartsOutRule, Map<string, number>> = {
  double: finishRanks("double"),
  master: finishRanks("master"),
  straight: finishRanks("straight"),
};

/** The best single dart that finishes exactly `value`, per out rule. */
const buildFinishMap = (rule: DartsOutRule): Map<number, Dart> => {
  const map = new Map<number, Dart>();
  for (const d of FINISH_DARTS[rule]) {
    if (!satisfiesOut(d, rule)) continue;
    const value = dartValue(d);
    // The list is ordered best-first, so the first entry for a value stays.
    if (!map.has(value)) map.set(value, d);
  }
  return map;
};

const FINISH_MAP: Record<DartsOutRule, Map<number, Dart>> = {
  double: buildFinishMap("double"),
  master: buildFinishMap("master"),
  straight: buildFinishMap("straight"),
};

type RankedRoute = { route: Dart[]; cost: number };

const cache = new Map<string, RankedRoute | null>();

/** Cheapest route that finishes `remaining` in exactly `depth` darts. */
function routeOfDepth(
  remaining: number,
  depth: number,
  rule: DartsOutRule,
): RankedRoute | null {
  const key = `${rule}|${remaining}|${depth}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let best: RankedRoute | null = null;

  if (depth === 1) {
    const finish = FINISH_MAP[rule].get(remaining);
    if (finish) {
      best = {
        route: [finish],
        cost: FINISH_RANK[rule].get(dartKey(finish)) ?? 0,
      };
    }
  } else {
    for (const prefix of PREFIX_DARTS) {
      const value = dartValue(prefix);
      // Scoring past the target, or onto it, is a bust rather than a setup.
      if (value <= 0 || value >= remaining) continue;
      const rest = routeOfDepth(remaining - value, depth - 1, rule);
      if (!rest) continue;
      const cost = (PREFIX_RANK.get(dartKey(prefix)) ?? 0) + rest.cost;
      if (!best || cost < best.cost) {
        best = { route: [prefix, ...rest.route], cost };
      }
    }
  }

  cache.set(key, best);
  return best;
}

/**
 * How to finish `remaining` with the darts still in hand, or `null` when it
 * cannot be done. Shorter routes always beat longer ones.
 */
export function checkoutRoute(
  remaining: number,
  dartsLeft: number,
  rule: DartsOutRule,
): Dart[] | null {
  if (remaining <= 0) return null;
  const maxDepth = Math.min(dartsLeft, DARTS_PER_TURN);
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const found = routeOfDepth(remaining, depth, rule);
    if (found) return found.route;
  }
  return null;
}

export const canCheckout = (
  remaining: number,
  dartsLeft: number,
  rule: DartsOutRule,
): boolean => checkoutRoute(remaining, dartsLeft, rule) !== null;
