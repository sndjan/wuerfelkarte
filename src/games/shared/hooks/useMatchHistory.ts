"use client";

import { useEffect, useState } from "react";

/**
 * Reads a game's match history after mount — localStorage is not available
 * during SSR, so the first render is always the empty list.
 */
export function useMatchHistory<TMatch>(load: () => TMatch[]): TMatch[] {
  const [matches, setMatches] = useState<TMatch[]>([]);

  useEffect(() => {
    setMatches(load());
    // The loader is a stable module function; re-running on identity changes
    // would re-read storage on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return matches;
}
