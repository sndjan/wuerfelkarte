/**
 * Optimal solitaire solver for the Wunder card under the German championship
 * rules ("Meisterschaftsregel" in Schmidt Spiele's Kniffel manual): maximises
 * the expected final score by backward induction over every scorecard state
 * (which of the 13 fields are filled × upper-section sum capped at the bonus
 * threshold × whether the Wunder field holds 50), the same approach as
 * Holderied's Kniffel solver.
 *
 * Dice are handled as multisets: a "keep" is any multiset of 0–5 dice (462 of
 * them), a "roll" is a keep of all 5 dice (252). Rolling the missing dice is
 * modelled one die at a time, so the value of a keep is just the average of
 * its six one-die-larger children.
 */

export const CATEGORIES = [
  "Einser",
  "Zweier",
  "Dreier",
  "Vierer",
  "Fünfer",
  "Sechser",
  "Dreierpasch",
  "Viererpasch",
  "Full House",
  "Kleine Straße",
  "Große Straße",
  "Wunder",
  "Chance",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type SolverRules = {
  upperBonusThreshold: number;
  upperBonus: number;
  fullHouse: number;
  smallStraight: number;
  largeStraight: number;
  wunder: number;
  /** Whether five of a kind may also be entered as a Full House. */
  wunderCountsAsFullHouse: boolean;
  /**
   * Bonus for each further Wunder once the Wunder field holds a score; 0 turns
   * the rule off. The roll must then go into a free matching field — its upper
   * field, Dreierpasch, Viererpasch or Chance, never Full House or a straight —
   * and if none is free, any field is crossed out. The bonus counts either way.
   */
  extraWunderBonus: number;
};

/**
 * Championship rules: 35 bonus at 63, a Wunder is no Full House, +50 for each
 * further Wunder. Crossing out any field is always allowed, which is what a
 * maximising solver assumes anyway.
 */
export const tournamentRules: SolverRules = {
  upperBonusThreshold: 63,
  upperBonus: 35,
  fullHouse: 25,
  smallStraight: 30,
  largeStraight: 40,
  wunder: 50,
  wunderCountsAsFullHouse: false,
  extraWunderBonus: 50,
};

/**
 * URL of the precomputed tournamentRules table, below public/. Written by
 * scripts/build-solver-table.ts, loaded by loadSolver.
 */
export const SOLVER_TABLE_PATH = "/solver/kniffel-tournament.bin";

/** A scorecard position at the start of a turn. */
export type TurnState = {
  filled: readonly Category[];
  /** Sum of the entered upper-section fields (Einser–Sechser). */
  upperSum: number;
  /** Whether the Wunder field holds 50, so further Wunders earn the bonus. */
  wunderScored?: boolean;
};

export type TurnOption =
  | { kind: "keep"; dice: number[]; expected: number }
  | {
      kind: "score";
      category: Category;
      /** The value written into the field. */
      points: number;
      /** Upper-section and extra-Wunder bonus earned by this entry. */
      bonus: number;
      expected: number;
    };

export type Solver = {
  rules: SolverRules;
  /** Expected points still to come from this state, including the bonus. */
  expectedScore(state: TurnState): number;
  /**
   * Every choice for these dice, best first. `rollsLeft` 1 or 2 asks which
   * dice to keep (keeping all five = stopping); 0 asks which field to fill.
   * `expected` is the expected points from the start of this turn onwards.
   */
  analyze(state: TurnState, dice: readonly number[], rollsLeft: 0 | 1 | 2): TurnOption[];
  /** The state table as 32-bit floats, reachable states only; see solverFromTable. */
  serialize(): ArrayBuffer;
};

const FACES = 6;
const DICE = 5;
const CATEGORY_COUNT = CATEGORIES.length;
const FULL_MASK = (1 << CATEGORY_COUNT) - 1;
const DREIERPASCH = CATEGORIES.indexOf("Dreierpasch");
const VIERERPASCH = CATEGORIES.indexOf("Viererpasch");
const WUNDER = CATEGORIES.indexOf("Wunder");
const CHANCE = CATEGORIES.indexOf("Chance");

export function scoreCategory(
  dice: readonly number[],
  category: Category,
  rules: SolverRules = tournamentRules,
): number {
  const counts = new Array<number>(FACES).fill(0);
  for (const die of dice) counts[die - 1]++;
  return scoreCounts(counts, CATEGORIES.indexOf(category), rules);
}

function scoreCounts(counts: readonly number[], category: number, rules: SolverRules): number {
  const sum = counts.reduce((acc, count, face) => acc + count * (face + 1), 0);
  const most = Math.max(...counts);
  const run = longestRun(counts);
  switch (CATEGORIES[category]) {
    case "Dreierpasch":
      return most >= 3 ? sum : 0;
    case "Viererpasch":
      return most >= 4 ? sum : 0;
    case "Full House":
      return (counts.includes(3) && counts.includes(2)) ||
        (most === 5 && rules.wunderCountsAsFullHouse)
        ? rules.fullHouse
        : 0;
    case "Kleine Straße":
      return run >= 4 ? rules.smallStraight : 0;
    case "Große Straße":
      return run === 5 ? rules.largeStraight : 0;
    case "Wunder":
      return most === 5 ? rules.wunder : 0;
    case "Chance":
      return sum;
    default:
      return counts[category] * (category + 1);
  }
}

function longestRun(counts: readonly number[]): number {
  let best = 0;
  let current = 0;
  for (const count of counts) {
    current = count > 0 ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

/** Dice-only lookup tables, independent of rules and scorecard. */
type DiceTables = {
  /** Face counts per keep, FACES entries each. */
  keepCounts: Uint8Array[];
  /** Keep index after adding one die of each face; -1 for full keeps. */
  children: Int16Array;
  /** Non-full keeps, largest first, so children are always done first. */
  partialOrder: number[];
  emptyKeep: number;
  /** Keep index of each roll, and roll index of each full keep (-1 otherwise). */
  rollKeep: Int16Array;
  keepRoll: Int16Array;
  /** Distinct sub-keeps of each roll: subKeeps[subStart[r] .. subStart[r+1]). */
  subStart: Int32Array;
  subKeeps: Int16Array;
  keepIndex(counts: readonly number[]): number;
};

function countsKey(counts: readonly number[]): number {
  let key = 0;
  for (let face = FACES - 1; face >= 0; face--) key = key * (DICE + 1) + counts[face];
  return key;
}

function buildDiceTables(): DiceTables {
  const keepCounts: Uint8Array[] = [];
  const enumerate = (counts: number[], face: number, remaining: number) => {
    if (face === FACES) {
      keepCounts.push(Uint8Array.from(counts));
      return;
    }
    for (let n = 0; n <= remaining; n++) {
      counts[face] = n;
      enumerate(counts, face + 1, remaining - n);
    }
    counts[face] = 0;
  };
  enumerate(new Array(FACES).fill(0), 0, DICE);

  const byKey = new Map<number, number>();
  keepCounts.forEach((counts, index) => byKey.set(countsKey(Array.from(counts)), index));
  const keepIndex = (counts: readonly number[]) => byKey.get(countsKey(counts))!;
  const size = (keep: number) => keepCounts[keep].reduce((a, b) => a + b, 0);

  const children = new Int16Array(keepCounts.length * FACES).fill(-1);
  const rollKeep: number[] = [];
  const keepRoll = new Int16Array(keepCounts.length).fill(-1);
  keepCounts.forEach((counts, keep) => {
    if (size(keep) === DICE) {
      keepRoll[keep] = rollKeep.length;
      rollKeep.push(keep);
      return;
    }
    for (let face = 0; face < FACES; face++) {
      const child = Array.from(counts);
      child[face]++;
      children[keep * FACES + face] = keepIndex(child);
    }
  });

  const partialOrder = keepCounts
    .map((_, keep) => keep)
    .filter((keep) => size(keep) < DICE)
    .sort((a, b) => size(b) - size(a));

  const subStart = new Int32Array(rollKeep.length + 1);
  const subKeeps: number[] = [];
  rollKeep.forEach((keep, roll) => {
    subStart[roll] = subKeeps.length;
    const counts = keepCounts[keep];
    const sub = (current: number[], face: number) => {
      if (face === FACES) {
        subKeeps.push(keepIndex(current));
        return;
      }
      for (let n = 0; n <= counts[face]; n++) {
        current[face] = n;
        sub(current, face + 1);
      }
    };
    sub(new Array(FACES).fill(0), 0);
  });
  subStart[rollKeep.length] = subKeeps.length;

  return {
    keepCounts,
    children,
    partialOrder,
    emptyKeep: keepIndex(new Array(FACES).fill(0)),
    rollKeep: Int16Array.from(rollKeep),
    keepRoll,
    subStart,
    subKeeps: Int16Array.from(subKeeps),
    keepIndex,
  };
}

/** reachable[upperMask][u]: whether upper sum u (capped) is possible. */
function buildReachableUpper(threshold: number): Uint8Array[] {
  const reachable: Uint8Array[] = [];
  for (let mask = 0; mask < 1 << 6; mask++) {
    const sums = new Uint8Array(threshold + 1);
    if (mask === 0) {
      sums[0] = 1;
    } else {
      const face = 31 - Math.clz32(mask & -mask);
      const rest = reachable[mask & (mask - 1)];
      for (let u = 0; u <= threshold; u++) {
        if (!rest[u]) continue;
        for (let n = 0; n <= DICE; n++) sums[Math.min(threshold, u + n * (face + 1))] = 1;
      }
    }
    reachable.push(sums);
  }
  return reachable;
}

/**
 * Computes the full state table. This is the expensive step (around 15
 * seconds); the app loads a precomputed table with solverFromTable instead.
 */
export function createSolver(rules: SolverRules = tournamentRules): Solver {
  return buildSolver(rules, null);
}

/**
 * A solver from a table written by Solver.serialize for the same rules.
 * Values are stored as 32-bit floats, so expectations agree with a fresh
 * computation to about 0.0001 points.
 */
export function solverFromTable(data: ArrayBuffer, rules: SolverRules = tournamentRules): Solver {
  return buildSolver(rules, new Float32Array(data));
}

function buildSolver(rules: SolverRules, table: Float32Array | null): Solver {
  const tables = buildDiceTables();
  const { children, partialOrder, emptyKeep, rollKeep, keepRoll, subStart, subKeeps } = tables;
  const rollCount = rollKeep.length;
  const keepCount = tables.keepCounts.length;
  const threshold = rules.upperBonusThreshold;
  const stride = threshold + 1;

  const scores = new Int16Array(rollCount * CATEGORY_COUNT);
  /** Upper-field index of a five-of-a-kind roll, -1 for other rolls. */
  const wunderFace = new Int8Array(rollCount).fill(-1);
  for (let roll = 0; roll < rollCount; roll++) {
    const counts = Array.from(tables.keepCounts[rollKeep[roll]]);
    for (let c = 0; c < CATEGORY_COUNT; c++) {
      scores[roll * CATEGORY_COUNT + c] = scoreCounts(counts, c, rules);
    }
    wunderFace[roll] = counts.indexOf(DICE);
  }

  // Indexed by stateIndex; the full card is worth 0 (bonuses are paid on the
  // move that earns them). `scored` is 1 when the Wunder field holds 50 and
  // the extra-Wunder rule is on, else 0.
  const stateIndex = (mask: number, upper: number, scored: number) =>
    (mask * stride + upper) * 2 + scored;
  const stateValue = new Float64Array((FULL_MASK + 1) * stride * 2);

  const isExtraWunder = (scored: number, roll: number) => scored === 1 && wunderFace[roll] >= 0;

  /** Fields an extra Wunder fits: its upper field, both Pasch fields, Chance. */
  const extraWunderFields = (roll: number) =>
    (1 << wunderFace[roll]) | (1 << DREIERPASCH) | (1 << VIERERPASCH) | (1 << CHANCE);

  /** Fields this roll may be entered in; an extra Wunder must fit if it can. */
  const entryMask = (mask: number, scored: number, roll: number) => {
    const open = FULL_MASK & ~mask;
    if (!isExtraWunder(scored, roll)) return open;
    return open & extraWunderFields(roll) || open;
  };

  // Written by `entry` so `analyze` can report them without allocating in
  // the hot loop.
  let entryPoints = 0;
  let entryBonus = 0;

  /** Expected total of entering this roll in field c (from entryMask). */
  const entry = (mask: number, upper: number, scored: number, roll: number, c: number) => {
    const extra = isExtraWunder(scored, roll);
    // An extra Wunder that fits nowhere crosses out the chosen field.
    const points =
      extra && !(extraWunderFields(roll) & (1 << c)) ? 0 : scores[roll * CATEGORY_COUNT + c];
    let bonus = extra ? rules.extraWunderBonus : 0;
    let nextUpper = upper;
    if (c < 6) {
      nextUpper = Math.min(threshold, upper + points);
      if (upper < threshold && nextUpper >= threshold) bonus += rules.upperBonus;
    }
    const nextScored = c === WUNDER ? (points > 0 && rules.extraWunderBonus > 0 ? 1 : 0) : scored;
    entryPoints = points;
    entryBonus = bonus;
    return points + bonus + stateValue[stateIndex(mask | (1 << c), nextUpper, nextScored)];
  };

  // Per-turn buffers: best value of each roll / keep before roll 3, 2, 1.
  const rollBest = [new Float64Array(rollCount), new Float64Array(rollCount), new Float64Array(rollCount)];
  const keepValue = [new Float64Array(keepCount), new Float64Array(keepCount), new Float64Array(keepCount)];

  const spreadToKeeps = (best: Float64Array, value: Float64Array) => {
    for (let roll = 0; roll < rollCount; roll++) value[rollKeep[roll]] = best[roll];
    for (const keep of partialOrder) {
      let sum = 0;
      for (let face = 0; face < FACES; face++) sum += value[children[keep * FACES + face]];
      value[keep] = sum / FACES;
    }
  };

  const bestKeep = (value: Float64Array, best: Float64Array) => {
    for (let roll = 0; roll < rollCount; roll++) {
      let max = -Infinity;
      for (let i = subStart[roll]; i < subStart[roll + 1]; i++) {
        const v = value[subKeeps[i]];
        if (v > max) max = v;
      }
      best[roll] = max;
    }
  };

  /** Fills the buffers for this state; index 0 = last roll, 2 = first. */
  const evaluateTurn = (mask: number, upper: number, scored: number): number => {
    for (let roll = 0; roll < rollCount; roll++) {
      const fields = entryMask(mask, scored, roll);
      let max = -Infinity;
      for (let c = 0; c < CATEGORY_COUNT; c++) {
        if (!(fields & (1 << c))) continue;
        const v = entry(mask, upper, scored, roll, c);
        if (v > max) max = v;
      }
      rollBest[0][roll] = max;
    }
    spreadToKeeps(rollBest[0], keepValue[0]);
    bestKeep(keepValue[0], rollBest[1]);
    spreadToKeeps(rollBest[1], keepValue[1]);
    bestKeep(keepValue[1], rollBest[2]);
    spreadToKeeps(rollBest[2], keepValue[2]);
    return keepValue[2][emptyKeep];
  };

  // Every reachable state in a fixed order, which is also the table layout.
  // A full card is reachable but always worth 0, so it is left out.
  const reachable = buildReachableUpper(threshold);
  const reachableStates: number[] = [];
  for (let mask = 0; mask < FULL_MASK; mask++) {
    const sums = reachable[mask & 63];
    const scoredStates = mask & (1 << WUNDER) && rules.extraWunderBonus > 0 ? 2 : 1;
    for (let upper = 0; upper <= threshold; upper++) {
      if (!sums[upper]) continue;
      for (let scored = 0; scored < scoredStates; scored++) {
        reachableStates.push(stateIndex(mask, upper, scored));
      }
    }
  }

  if (table) {
    if (table.length !== reachableStates.length) {
      throw new Error(
        `Solver table has ${table.length} states, these rules need ${reachableStates.length}`,
      );
    }
    reachableStates.forEach((index, i) => (stateValue[index] = table[i]));
  } else {
    // Later states have more fields filled, i.e. a larger mask: go backwards.
    for (let i = reachableStates.length - 1; i >= 0; i--) {
      const index = reachableStates[i];
      const scored = index % 2;
      const upper = ((index - scored) / 2) % stride;
      const mask = Math.floor(index / 2 / stride);
      stateValue[index] = evaluateTurn(mask, upper, scored);
    }
  }

  const toIndexParts = (state: TurnState) => {
    let mask = 0;
    for (const category of state.filled) mask |= 1 << CATEGORIES.indexOf(category);
    const scored =
      state.wunderScored && mask & (1 << WUNDER) && rules.extraWunderBonus > 0 ? 1 : 0;
    return { mask, upper: Math.min(threshold, state.upperSum), scored };
  };

  const facesOf = (counts: ArrayLike<number>) => {
    const dice: number[] = [];
    for (let face = 0; face < FACES; face++) for (let n = 0; n < counts[face]; n++) dice.push(face + 1);
    return dice;
  };

  return {
    rules,
    expectedScore(state) {
      const { mask, upper, scored } = toIndexParts(state);
      return stateValue[stateIndex(mask, upper, scored)];
    },
    analyze(state, dice, rollsLeft) {
      if (dice.length !== DICE || dice.some((d) => !Number.isInteger(d) || d < 1 || d > FACES)) {
        throw new Error(`Expected ${DICE} dice with faces 1–${FACES}, got [${dice.join(", ")}]`);
      }
      const { mask, upper, scored } = toIndexParts(state);
      if (mask === FULL_MASK) throw new Error("The scorecard is already full");
      evaluateTurn(mask, upper, scored);

      const counts = new Array<number>(FACES).fill(0);
      for (const die of dice) counts[die - 1]++;
      const roll = keepRoll[tables.keepIndex(counts)];

      const options: TurnOption[] = [];
      if (rollsLeft === 0) {
        const fields = entryMask(mask, scored, roll);
        for (let c = 0; c < CATEGORY_COUNT; c++) {
          if (!(fields & (1 << c))) continue;
          const expected = entry(mask, upper, scored, roll, c);
          options.push({
            kind: "score",
            category: CATEGORIES[c],
            points: entryPoints,
            bonus: entryBonus,
            expected,
          });
        }
      } else {
        // After roll 2 the keep leads into the last roll (buffer 0), after
        // roll 1 into the second (buffer 1).
        const value = keepValue[rollsLeft - 1];
        for (let i = subStart[roll]; i < subStart[roll + 1]; i++) {
          const keep = subKeeps[i];
          options.push({ kind: "keep", dice: facesOf(tables.keepCounts[keep]), expected: value[keep] });
        }
      }
      return options.sort((a, b) => b.expected - a.expected);
    },
    serialize() {
      return Float32Array.from(reachableStates, (index) => stateValue[index]).buffer;
    },
  };
}
