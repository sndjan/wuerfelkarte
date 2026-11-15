/**
 * The colour of the bonus bar: how often each open number still has to fall,
 * on average, to reach the bonus. Three of each is exactly 63 in the classic
 * card, so that is "par"; the steps above it read as falling behind.
 */

export type BonusPace = "reached" | "onTrack" | "behind" | "farBehind" | "lost";

const FACE: Record<string, number> = { Einser: 1, Zweier: 2, Dreier: 3, Vierer: 4, Fünfer: 5, Sechser: 6 };

export function bonusPace(
  points: Record<string, number | "X" | undefined>,
  bonus: { fields: string[]; minSum: number },
  /** The most of one number a turn can bring: the dice count (5, 3 in Mini, 6 in Super). */
  maxPerFace: number,
  doubled?: Set<string>,
): { sum: number; pace: BonusPace } {
  let sum = 0;
  let openFaces = 0;
  let allFaces = 0;
  for (const key of bonus.fields) {
    const face = FACE[key] ?? 0;
    allFaces += face;
    const value = points[key];
    if (typeof value === "number" && value > 0) sum += doubled?.has(key) ? value * 2 : value;
    else if (value === undefined || value === 0) openFaces += face;
  }
  const needed = bonus.minSum - sum;
  if (needed <= 0) return { sum, pace: "reached" };
  if (openFaces === 0 || needed > maxPerFace * openFaces) return { sum, pace: "lost" };
  const par = allFaces > 0 ? bonus.minSum / allFaces : 3;
  const average = needed / openFaces;
  if (average <= par) return { sum, pace: "onTrack" };
  if (average <= par + 1) return { sum, pace: "behind" };
  return { sum, pace: "farBehind" };
}

/** Bar colour per pace, from the design system's tokens. */
export const PACE_COLOR: Record<BonusPace, string> = {
  reached: "var(--brand)",
  onTrack: "var(--brand)",
  behind: "var(--gold)",
  farBehind: "var(--danger)",
  lost: "var(--border-strong)",
};

export const PACE_WORD: Record<BonusPace, string> = {
  reached: "erreicht",
  onTrack: "im Plan",
  behind: "knapp zurück",
  farBehind: "weit zurück",
  lost: "nicht mehr möglich",
};
