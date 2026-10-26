import { getSupabase } from "@/lib/supabase";
import { readJSON, removeKey, writeJSON } from "@/games/shared/storage";
import { POINTS_PERFECT, PUZZLES_PER_DAY } from "./puzzles";

/**
 * How everyone else did on a day — anonymous: the server only ever gets the
 * day's points and a random token made up for that one day, which keeps a
 * second submission out but links nothing across days.
 */

const MAX_TOTAL = PUZZLES_PER_DAY * POINTS_PERFECT;

/**
 * Lower bound of each bar. Most players land high, so the top of the scale
 * is split finer; a perfect day gets a bar of its own.
 */
export const BUCKET_STARTS = [0, 180, 210, 240, 255, 270, 285, MAX_TOTAL] as const;

export const bucketLabel = (index: number): string =>
  index === 0 ? `<${BUCKET_STARTS[1]}` : String(BUCKET_STARTS[index]);

export function bucketIndex(total: number): number {
  let index = 0;
  while (index + 1 < BUCKET_STARTS.length && total >= BUCKET_STARTS[index + 1]) index++;
  return index;
}

/** Players per day total, as the server counts them. */
export type ScoreCounts = { total: number; players: number }[];

export function bucketCounts(counts: ScoreCounts): number[] {
  const bars = BUCKET_STARTS.map(() => 0);
  for (const { total, players } of counts) bars[bucketIndex(total)] += players;
  return bars;
}

/**
 * Where a total stands among the other players. `included` says whether the
 * counts already hold the player's own result, which then is not compared
 * with itself.
 */
export function standing(counts: ScoreCounts, total: number, included: boolean) {
  const own = included ? 1 : 0;
  const others = counts.reduce((sum, c) => sum + c.players, 0) - own;
  const lower = counts.filter((c) => c.total < total).reduce((sum, c) => sum + c.players, 0);
  const equal = counts.filter((c) => c.total === total).reduce((sum, c) => sum + c.players, 0) - own;
  const percent = (n: number) => (others > 0 ? Math.round((n / others) * 100) : 0);
  return { others, betterThan: percent(lower), sameAs: percent(equal) };
}

/** Today's result, kept until the server has it. */
type Submission = { date: string; token: string; points: number[]; sent: boolean };

const SUBMISSION_KEY = "quiz:submission";

const loadSubmission = () => readJSON<Submission | null>(SUBMISSION_KEY, null);

/** Queues a day finished on its own date for the distribution. */
export function queueSubmission(date: string, points: number[]): void {
  if (loadSubmission()?.date === date) return;
  writeJSON(SUBMISSION_KEY, { date, token: crypto.randomUUID(), points, sent: false });
}

/** Whether the server already counts this browser's result for the date. */
export const isSubmitted = (date: string): boolean => {
  const submission = loadSubmission();
  return submission?.date === date && submission.sent;
};

/**
 * Sends a queued result. A failure leaves it queued for the next visit; the
 * server ignores the token if an earlier attempt did arrive after all.
 */
export async function flushSubmission(): Promise<void> {
  const submission = loadSubmission();
  const supabase = getSupabase();
  if (!submission || submission.sent || !supabase) return;
  try {
    const { error } = await supabase.rpc("submit_quiz_result", {
      p_date: submission.date,
      p_token: submission.token,
      p_points: submission.points,
    });
    if (!error) writeJSON(SUBMISSION_KEY, { ...submission, sent: true });
    // A day the server no longer accepts will never go through.
    else if (error.message.includes("out of range")) removeKey(SUBMISSION_KEY);
  } catch {
    // Offline — try again next time.
  }
}

/** Null when there is no backend or it cannot be reached. */
export async function fetchDistribution(date: string): Promise<ScoreCounts | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("get_quiz_distribution", { p_date: date });
    if (error || !Array.isArray(data)) return null;
    return (data as { total: number; players: number | string }[]).map((row) => ({
      total: Number(row.total),
      players: Number(row.players),
    }));
  } catch {
    return null;
  }
}
