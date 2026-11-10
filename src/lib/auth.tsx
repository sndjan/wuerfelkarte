"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

import { getSupabase } from "@/lib/supabase";
import { startSync, stopSync } from "@/lib/sync/client";

type AuthState = {
  user: User | null;
  /** True until the stored session has been read. */
  loading: boolean;
  /** False when the app runs without Supabase, so there are no accounts. */
  available: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, loading: true, available: false });

/**
 * The optional account. Signing in only adds the sync: the app keeps working
 * from localStorage either way.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, available: true });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setState({ user: null, loading: false, available: false });
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setState({ user, loading: false, available: true });
      // Supabase calls this while holding its auth lock; anything that queries
      // the API from inside it waits for itself, so the sync starts afterwards.
      setTimeout(() => {
        if (user) startSync(user.id);
        else stopSync({ forget: event === "SIGNED_OUT" });
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
