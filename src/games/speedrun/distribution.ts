import { getSupabase } from "@/lib/supabase";
import { readJSON, removeKey, writeJSON } from "@/games/shared/storage";

/**
 * How everyone did on a Tagesrun — anonymous like the quiz: the server gets
 * the run's time, its penalty and a random token made up for that one day.
 * Only the day's ranked run is sent.
 */

/** Lower bound of each bar, in seconds of Wertungszeit. */
export const BUCKET_STARTS = [0, 75, 90, 105, 120, 150, 180] as const;

const minutes = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export const bucketLabel = (index: number): string =>
  index === 0 ? `<${minutes(BUCKET_STARTS[1])}` : minutes(BUCKET_STARTS[index]);

export function bucketIndex(seconds: number): number {
  let index = 0;
  while (index + 1 < BUCKET_STARTS.length && seconds >= BUCKET_STARTS[index + 1]) index++;
  return index;
}

/** Players per whole second of Wertungszeit, as the server counts them. */
export type TimeCounts = { seconds: number; players: number }[];

export function bucketCounts(counts: TimeCounts): number[] {
  const bars = BUCKET_STARTS.map(() => 0);
  for (const { seconds, players } of counts) bars[bucketIndex(seconds)] += players;
  return bars;
}

/**
 * Where a time stands among the other players — lower is better. `included`
 * says whether the counts already hold the player's own run.
 */
export function standing(counts: TimeCounts, seconds: number, included: boolean) {
  const others = counts.reduce((sum, c) => sum + c.players, 0) - (included ? 1 : 0);
  const slower = counts.filter((c) => c.seconds > seconds).reduce((sum, c) => sum + c.players, 0);
  return { others, fasterThan: others > 0 ? Math.round((slower / others) * 100) : 0 };
}

type Submission = {
  date: string;
  token: string;
  timeMs: number;
  strafeMs: number;
  sent: boolean;
};

const SUBMISSION_KEY = "speedrun:submission";

const loadSubmission = () => readJSON<Submission | null>(SUBMISSION_KEY, null);

/** Queues the day's ranked run for the distribution. */
export function queueSubmission(date: string, timeMs: number, strafeMs: number): void {
  if (loadSubmission()?.date === date) return;
  writeJSON(SUBMISSION_KEY, { date, token: crypto.randomUUID(), timeMs, strafeMs, sent: false });
}

export const isSubmitted = (date: string): boolean => {
  const submission = loadSubmission();
  return submission?.date === date && submission.sent;
};

/** Sends a queued run; a failure leaves it queued for the next visit. */
export async function flushSubmission(): Promise<void> {
  const submission = loadSubmission();
  const supabase = getSupabase();
  if (!submission || submission.sent || !supabase) return;
  try {
    const { error } = await supabase.rpc("submit_speedrun_result", {
      p_date: submission.date,
      p_token: submission.token,
      p_time_ms: Math.round(submission.timeMs),
      p_strafe_ms: Math.round(submission.strafeMs),
    });
    if (!error) writeJSON(SUBMISSION_KEY, { ...submission, sent: true });
    else if (error.message.includes("out of range")) removeKey(SUBMISSION_KEY);
  } catch {
    // Offline — try again next time.
  }
}

/** Null when there is no backend or it cannot be reached. */
export async function fetchDistribution(date: string): Promise<TimeCounts | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("get_speedrun_distribution", { p_date: date });
    if (error || !Array.isArray(data)) return null;
    return (data as { seconds: number; players: number | string }[]).map((row) => ({
      seconds: Number(row.seconds),
      players: Number(row.players),
    }));
  } catch {
    return null;
  }
}
