import { useEffect, useState } from "react";
import { RosterPlayer } from "@/components/yatzy-lobby/types";

const STORAGE_KEY = "kniffel:roster";

const loadRosterFromStorage = (): RosterPlayer[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RosterPlayer[];
  } catch {
    return [];
  }
};

const saveRosterToStorage = (roster: RosterPlayer[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
  } catch {
    // Handle storage errors silently
  }
};

export function usePlayerRoster() {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  // Guards the save effect from overwriting stored data with the initial
  // empty array before the load effect has had a chance to run.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRoster(loadRosterFromStorage());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveRosterToStorage(roster);
    }
  }, [roster, loaded]);

  const addPlayer = (name: string, emoji: string) => {
    setRoster((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, emoji, active: true },
    ]);
  };

  const toggleActive = (id: string) => {
    setRoster((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    );
  };

  const renamePlayer = (id: string, name: string) => {
    setRoster((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const changeEmoji = (id: string, emoji: string) => {
    setRoster((prev) => prev.map((p) => (p.id === id ? { ...p, emoji } : p)));
  };

  const removePlayer = (id: string) => {
    setRoster((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    roster,
    addPlayer,
    toggleActive,
    renamePlayer,
    changeEmoji,
    removePlayer,
  };
}
