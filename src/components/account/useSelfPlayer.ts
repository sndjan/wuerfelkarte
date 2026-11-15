"use client";

import { useEffect, useState } from "react";

import { loadRoster } from "@/games/shared/roster";
import type { RosterPlayer } from "@/games/shared/types";
import { loadSelfPlayerId } from "@/lib/links/self";
import { useSyncRefresh } from "@/lib/sync/useSyncRefresh";

/** The roster entry marked „Das bin ich“, kept fresh across syncs; null when none is marked. */
export function useSelfPlayer(): RosterPlayer | null {
  const [self, setSelf] = useState<RosterPlayer | null>(null);
  const read = () => {
    const id = loadSelfPlayerId();
    setSelf(id ? (loadRoster().find((p) => p.id === id) ?? null) : null);
  };
  useEffect(read, []);
  useSyncRefresh(read);
  useEffect(() => {
    // The profile page changes the character in place; follow it without a reload.
    window.addEventListener(SELF_CHANGED_EVENT, read);
    return () => window.removeEventListener(SELF_CHANGED_EVENT, read);
  }, []);
  return self;
}

export const SELF_CHANGED_EVENT = "wuerfelkarte:self-changed";
