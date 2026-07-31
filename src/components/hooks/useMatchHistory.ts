"use client";

import { useEffect, useState } from "react";

export type StoredMatchPlayer = { name: string; score: number };

export type StoredMatch = {
  players: StoredMatchPlayer[];
  gamemode: string;
  timestamp: string;
  durationMs?: number;
};

function loadMatchHistory(): StoredMatch[] {
  try {
    const stored = localStorage.getItem("lastMatches");
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function useMatchHistory(): StoredMatch[] {
  const [matches, setMatches] = useState<StoredMatch[]>([]);

  useEffect(() => {
    setMatches(loadMatchHistory());
  }, []);

  return matches;
}
