"use client";

import { useEffect, useRef } from "react";
import { SYNC_EVENT } from "./client";

/** Calls `reload` whenever the account sync brought new data into storage. */
export function useSyncRefresh(reload: () => void): void {
  const latest = useRef(reload);
  useEffect(() => {
    latest.current = reload;
  });

  useEffect(() => {
    const onSync = () => latest.current();
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);
}
