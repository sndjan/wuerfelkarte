import { useEffect, useState } from "react";
import { RosterPlayer } from "@/components/yatzy-lobby/types";
import {
  createRosterPlayer,
  loadRoster,
  nextSelectionOrder,
  saveRoster,
} from "./playerRosterStorage";

export function usePlayerRoster() {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  // Guards the save effect from overwriting stored data with the initial
  // empty array before the load effect has had a chance to run.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRoster(loadRoster());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveRoster(roster);
    }
  }, [roster, loaded]);

  const addPlayer = (name: string, emoji: string) => {
    setRoster((prev) => [...prev, createRosterPlayer(name, emoji, prev)]);
  };

  const toggleActive = (id: string) => {
    setRoster((prev) => {
      const player = prev.find((p) => p.id === id);
      if (!player) return prev;
      if (player.active) {
        return prev.map((p) =>
          p.id === id ? { ...p, active: false, selectionOrder: null } : p,
        );
      }
      const nextOrder = nextSelectionOrder(prev);
      return prev.map((p) =>
        p.id === id ? { ...p, active: true, selectionOrder: nextOrder } : p,
      );
    });
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
