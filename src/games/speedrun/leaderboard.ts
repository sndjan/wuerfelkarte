import { getSupabase } from "@/lib/supabase";
import { readJSON, writeJSON } from "@/games/shared/storage";
import type { StoredSpeedrunMatch } from "./types";

/**
 * The global Speedrun leaderboard: one best run per signed-in account,
 * shown with the account's name and emoji. Runs on a typed-in seed and other
 * categories never get here.
 */

export type LeaderboardRow = {
  rank: number;
  name: string;
  emoji: string | null;
  wertungMs: number;
  isMe: boolean;
};

/**
 * "<account>:<run id>" of the last run the server has, so a best is sent
 * only once per account. Device-only, like the other submissions.
 */
const SENT_KEY = "speedrun:leaderboard";

/** Whether a run may stand on the leaderboard. */
export const isRanked = (match: StoredSpeedrunMatch) => match.category === "classic" && !match.customSeed;

/**
 * Sends a run for the signed-in account; the server keeps it only when it
 * beats the account's entry. False when it could not be sent (no backend,
 * offline, not signed in) — it is tried again with the next best.
 */
export async function submitBest(match: StoredSpeedrunMatch, userId: string): Promise<boolean> {
  const supabase = getSupabase();
  const sent = `${userId}:${match.id}`;
  if (!supabase || !isRanked(match) || readJSON<string | null>(SENT_KEY, null) === sent) return false;
  try {
    const { error } = await supabase.rpc("submit_speedrun_best", {
      p_time_ms: Math.round(match.timeMs),
      p_strafe_ms: Math.round(match.strafeMs),
      p_seed: match.seed ?? match.id,
    });
    if (error) return false;
    writeJSON(SENT_KEY, sent);
    return true;
  } catch {
    return false;
  }
}

/** The top of the leaderboard plus the caller's own row; null when unreachable. */
export async function fetchLeaderboard(limit = 10): Promise<LeaderboardRow[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("get_speedrun_leaderboard", { p_limit: limit });
    if (error || !Array.isArray(data)) return null;
    return (
      data as { rank: number | string; name: string; emoji: string | null; wertung_ms: number; is_me: boolean }[]
    ).map((row) => ({
      rank: Number(row.rank),
      name: row.name,
      emoji: row.emoji,
      wertungMs: Number(row.wertung_ms),
      isMe: Boolean(row.is_me),
    }));
  } catch {
    return null;
  }
}
