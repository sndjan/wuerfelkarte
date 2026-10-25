"use client";

import { useEffect, useState } from "react";

import { RunningGame } from "../resume";

/**
 * Reads the unfinished games after mount — localStorage is not available
 * during SSR, so the first render never shows a card.
 */
export function useRunningGames(load: () => RunningGame[]): RunningGame[] {
  const [running, setRunning] = useState<RunningGame[]>([]);

  useEffect(() => {
    setRunning(load());
    // The loader is a stable module function; re-running on identity changes
    // would re-read storage on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return running;
}
