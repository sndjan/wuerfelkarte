"use client";

import { useCallback, useEffect, useState } from "react";

export type FTRoundValue = number | "X" | null;

export type FTPlayer = {
  id: number;
  name: string;
  rounds: FTRoundValue[];
  score: number;
};

export type FTSettings = {
  winCondition: "lowest" | "highest";
  roundLimit: number | null;
  targetScore: number | null;
};

const STORAGE_KEY = "freeTrackingState";
const SETTINGS_KEY = "freeTrackingSettings";

const DEFAULT_SETTINGS: FTSettings = {
  winCondition: "highest",
  roundLimit: null,
  targetScore: null,
};

type StoredFTPlayer = {
  id: number;
  name: string;
  rounds: FTRoundValue[];
};

function computeScore(rounds: FTRoundValue[]): number {
  return rounds.reduce<number>(
    (acc, r) => acc + (typeof r === "number" ? r : 0),
    0
  );
}

export function useFreeTracking() {
  const [rawPlayers, setRawPlayers] = useState<StoredFTPlayer[]>([]);
  const [settings, setSettings] = useState<FTSettings>(DEFAULT_SETTINGS);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRawPlayers(JSON.parse(saved));
      } else {
        setRawPlayers([
          { id: Date.now(), name: "Player 1", rounds: [null] },
          { id: Date.now() + 1, name: "Player 2", rounds: [null] },
        ]);
      }
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    } catch {
      // ignore
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawPlayers));
  }, [rawPlayers, initialized]);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, initialized]);

  // Auto-add new round when all players fill the current round
  useEffect(() => {
    if (rawPlayers.length === 0) return;
    const currentRoundIndex = rawPlayers[0].rounds.length - 1;
    const roundLimitReached =
      settings.roundLimit !== null &&
      rawPlayers[0].rounds.length >= settings.roundLimit;
    if (roundLimitReached) return;
    const allFilled = rawPlayers.every((p) => p.rounds[currentRoundIndex] !== null);
    if (allFilled) {
      setRawPlayers((prev) =>
        prev.map((p) => ({ ...p, rounds: [...p.rounds, null] }))
      );
    }
  }, [rawPlayers, settings.roundLimit]);

  const addPlayer = useCallback(
    (name: string) => {
      const roundCount = rawPlayers.length > 0 ? rawPlayers[0].rounds.length : 1;
      setRawPlayers((prev) => [
        ...prev,
        {
          id: Date.now(),
          name,
          rounds: Array<FTRoundValue>(roundCount).fill(null),
        },
      ]);
    },
    [rawPlayers]
  );

  const removePlayer = useCallback((id: number) => {
    setRawPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const changeName = useCallback((id: number, name: string) => {
    setRawPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  }, []);

  const moveToRight = useCallback((id: number) => {
    setRawPlayers((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const moveToLeft = useCallback((id: number) => {
    setRawPlayers((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      return next;
    });
  }, []);

  const updateRound = useCallback(
    (id: number, roundIndex: number, value: FTRoundValue) => {
      setRawPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const rounds = [...p.rounds];
          rounds[roundIndex] = value;
          return { ...p, rounds };
        })
      );
    },
    []
  );

  const resetRounds = useCallback((id: number) => {
    setRawPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          rounds: Array<FTRoundValue>(p.rounds.length).fill(null),
        };
      })
    );
  }, []);

  const resetAllRounds = useCallback(() => {
    setRawPlayers((prev) => prev.map((p) => ({ ...p, rounds: [null] })));
  }, []);

  const resetAll = useCallback(() => {
    setRawPlayers([]);
  }, []);

  const updateSettings = useCallback((patch: Partial<FTSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const players: FTPlayer[] = rawPlayers.map((p) => ({
    ...p,
    score: computeScore(p.rounds),
  }));

  return {
    players,
    settings,
    initialized,
    addPlayer,
    removePlayer,
    changeName,
    moveToRight,
    moveToLeft,
    updateRound,
    resetRounds,
    resetAllRounds,
    resetAll,
    updateSettings,
  };
}
