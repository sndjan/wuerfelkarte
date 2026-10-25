import { POINTS_PERFECT, PUZZLES_PER_DAY, pointsTier, type PointsTier } from "./puzzles";

export const QUIZ_EMOJI = "🧠";
export const QUIZ_NAME = "Kniffel-Quiz";

const TIER_EMOJI: Record<PointsTier, string> = {
  perfect: "🟩",
  good: "🟨",
  close: "🟧",
  miss: "⬛",
};

const pointEmoji = (points: number) => TIER_EMOJI[pointsTier(points)];

/** The Wordle-style result line people paste into their group chat. */
export function shareText(date: string, points: readonly number[]): string {
  const total = points.reduce((a, b) => a + b, 0);
  const [year, month, day] = date.split("-");
  return [
    `${QUIZ_EMOJI} ${QUIZ_NAME} ${day}.${month}.${year}`,
    `${points.map(pointEmoji).join("")} ${total}/${PUZZLES_PER_DAY * POINTS_PERFECT}`,
  ].join("\n");
}
