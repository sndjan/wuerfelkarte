import { TURNS } from "@/games/training/game";
import type { SpeedrunCategory, StoredSpeedrunMatch } from "./types";

/**
 * Personal bests, derived from the stored runs of one category. Nothing
 * besides the runs themselves is stored.
 */

const ofCategory = (matches: readonly StoredSpeedrunMatch[], category: SpeedrunCategory) =>
  matches.filter((m) => m.category === category && m.splits?.length === TURNS);

/** The fastest run of the category by Wertungszeit, or null. */
export function personalBest(
  matches: readonly StoredSpeedrunMatch[],
  category: SpeedrunCategory,
  excludeId?: string,
): StoredSpeedrunMatch | null {
  let best: StoredSpeedrunMatch | null = null;
  for (const match of ofCategory(matches, category)) {
    if (match.id === excludeId) continue;
    if (!best || match.wertungMs < best.wertungMs) best = match;
  }
  return best;
}

/** One turn's own Wertungszeit within a run's cumulative splits. */
export const segment = (splits: readonly number[], index: number) =>
  splits[index] - (index > 0 ? splits[index - 1] : 0);

/** The fastest-ever segment per turn index, or null where none was run yet. */
export function goldSegments(
  matches: readonly StoredSpeedrunMatch[],
  category: SpeedrunCategory,
  excludeId?: string,
): (number | null)[] {
  const gold: (number | null)[] = Array.from({ length: TURNS }, () => null);
  for (const match of ofCategory(matches, category)) {
    if (match.id === excludeId) continue;
    for (let i = 0; i < TURNS; i++) {
      const s = segment(match.splits, i);
      if (gold[i] === null || s < gold[i]!) gold[i] = s;
    }
  }
  return gold;
}

/** Every gold segment added up: the best run the player has already proven. */
export function sumOfBest(gold: readonly (number | null)[]): number | null {
  return gold.every((g) => g !== null) ? gold.reduce<number>((a, g) => a + g!, 0) : null;
}

export type SplitMark = "gold" | "ahead" | "behind" | "none";

/**
 * How a finished turn went: a gold split beats every earlier run's same
 * turn; otherwise ahead or behind the personal best at that point.
 */
export function splitMark(
  runSplits: readonly number[],
  index: number,
  pb: StoredSpeedrunMatch | null,
  gold: readonly (number | null)[],
): SplitMark {
  const g = gold[index];
  if (g === null || segment(runSplits, index) < g) return "gold";
  if (!pb) return "none";
  return runSplits[index] <= pb.splits[index] ? "ahead" : "behind";
}
