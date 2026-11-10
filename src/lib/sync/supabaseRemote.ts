import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { RemoteRow, SyncRemote } from "./engine";

/** The `user_storage` table is missing: the migration has not been run yet. */
export class SyncUnavailableError extends Error {}

const PAGE = 500;

const fail = (error: PostgrestError): never => {
  // 42P01: undefined table; PGRST205: not in PostgREST's schema cache.
  if (error.code === "42P01" || error.code === "PGRST205") throw new SyncUnavailableError(error.message);
  throw new Error(error.message);
};

/** One row per key in `public.user_storage`; RLS keeps each user to their own. */
export function supabaseRemote(client: SupabaseClient, userId: string): SyncRemote {
  return {
    async pull(since) {
      const rows: RemoteRow[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = client
          .from("user_storage")
          .select("key, value, updated_at")
          .order("updated_at")
          .order("key")
          .range(from, from + PAGE - 1);
        if (since !== null) query = query.gt("updated_at", since);
        const { data, error } = await query;
        if (error) fail(error);
        const page = (data ?? []) as { key: string; value: unknown; updated_at: string }[];
        rows.push(...page.map((row) => ({ key: row.key, value: row.value, updatedAt: row.updated_at })));
        if (page.length < PAGE) return rows;
      }
    },

    async push(rows) {
      if (rows.length === 0) return [];
      const { data, error } = await client
        .from("user_storage")
        .upsert(
          rows.map((row) => ({ user_id: userId, key: row.key, value: row.value })),
          { onConflict: "user_id,key" },
        )
        .select("key, updated_at");
      if (error) fail(error);
      return ((data ?? []) as { key: string; updated_at: string }[]).map((row) => ({
        key: row.key,
        updatedAt: row.updated_at,
      }));
    },
  };
}
