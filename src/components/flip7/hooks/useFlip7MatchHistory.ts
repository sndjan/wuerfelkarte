"use client";

import { useEffect, useState } from "react";
import { loadFlip7Matches } from "../storage";
import { StoredFlip7Match } from "../types";

export function useFlip7MatchHistory(): StoredFlip7Match[] {
  const [matches, setMatches] = useState<StoredFlip7Match[]>([]);

  useEffect(() => {
    setMatches(loadFlip7Matches());
  }, []);

  return matches;
}
