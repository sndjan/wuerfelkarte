"use client";

import { useState } from "react";

/**
 * The "keep the totals secret until the end" toggle, persisted per game.
 * Returns the current value and a toggle that writes through to storage.
 */
export function useHideScores(
  load: () => boolean,
  save: (value: boolean) => void,
): [boolean, () => void] {
  const [hideScores, setHideScores] = useState(load);

  const toggle = () =>
    setHideScores((prev) => {
      const next = !prev;
      save(next);
      return next;
    });

  return [hideScores, toggle];
}
