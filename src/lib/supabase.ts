import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * The shared Supabase client, or null when the app runs without one (no env
 * vars, e.g. local development) — every caller must work without it.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client =
    url && key
      ? createClient(url, key, {
          auth: {
            // The session of an optional account, kept in localStorage.
            persistSession: true,
            autoRefreshToken: true,
            // /konto/callback handles the sign-in link itself, for both link styles.
            detectSessionInUrl: false,
            flowType: "pkce",
          },
        })
      : null;
  return client;
}
