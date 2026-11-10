"use client";

import { useEffect, useState } from "react";

import { useSyncRefresh } from "@/lib/sync/useSyncRefresh";

/**
 * Reads a game's match history after mount — localStorage is not available
 * during SSR, so the first render is always the empty list. Re-reads when the
 * account sync brings matches from another device.
 */
export function useMatchHistory<TMatch>(load: () => TMatch[]): TMatch[] {
  const [matches, setMatches] = useState<TMatch[]>([]);

  useEffect(() => {
    setMatches(load());
    // The loader is a stable module function; re-running on identity changes
    // would re-read storage on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSyncRefresh(() => setMatches(load()));

  return matches;
}
