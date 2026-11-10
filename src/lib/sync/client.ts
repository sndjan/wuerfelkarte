"use client";

import { setWriteListener } from "@/games/shared/storage";
import { forgetSharing, runSharing } from "@/lib/links/runner";
import { getSupabase } from "@/lib/supabase";
import { hasPendingChanges, linkDevice, markDirty, runSync, unlinkDevice } from "./engine";
import { isSyncedKey } from "./keys";
import { SyncUnavailableError, supabaseRemote } from "./supabaseRemote";

/**
 * Runs the account sync in the browser: after sign-in, a few seconds after
 * each change, and whenever the app comes back to the foreground or online.
 * Screens that read storage on mount listen for `SYNC_EVENT` to pick up
 * downloaded data.
 */

export const SYNC_EVENT = "wuerfelkarte:synced";

export type SyncStatus = {
  state: "off" | "syncing" | "synced" | "pending" | "error" | "unavailable";
  lastSyncedAt: number | null;
};

const DEBOUNCE_MS = 2_000;

let userId: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<void> | null = null;
let again = false;
let status: SyncStatus = { state: "off", lastSyncedAt: null };
const listeners = new Set<(status: SyncStatus) => void>();

const setStatus = (next: Partial<SyncStatus>) => {
  status = { ...status, ...next };
  listeners.forEach((listener) => listener(status));
};

export const getSyncStatus = () => status;

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const schedule = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
};

const onWrite = (key: string) => {
  if (!isSyncedKey(key)) return;
  markDirty(key);
  if (status.state === "synced") setStatus({ state: "pending" });
  schedule();
};

const onForeground = () => {
  if (document.visibilityState === "visible") void syncNow();
};

// A closing tab still gets its last change out if the request is quick.
const onHide = () => {
  if (hasPendingChanges()) void syncNow();
};

const onOnline = () => void syncNow();

export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  const supabase = getSupabase();
  const id = userId;
  if (!supabase || !id) return Promise.resolve();
  if (timer) clearTimeout(timer);

  setStatus({ state: "syncing" });
  running = runSync(supabaseRemote(supabase, id), id)
    .then(async ({ changed }) => {
      // Sharing with linked players is extra: when it fails, the sync still counts.
      const shared = await runSharing(supabase, id).catch(() => ({ changed: false }));
      return { changed: changed || shared.changed };
    })
    .then(({ changed }) => {
      if (userId !== id) return;
      setStatus({ state: hasPendingChanges() ? "pending" : "synced", lastSyncedAt: Date.now() });
      if (changed) window.dispatchEvent(new Event(SYNC_EVENT));
    })
    .catch((error) => {
      if (userId !== id) return;
      setStatus({ state: error instanceof SyncUnavailableError ? "unavailable" : "error" });
    })
    .finally(() => {
      running = null;
      if (again && userId === id) {
        again = false;
        void syncNow();
      }
    });
  return running;
}

export function startSync(id: string): void {
  if (userId === id) return;
  userId = id;
  linkDevice(id);
  setWriteListener(onWrite);
  document.addEventListener("visibilitychange", onForeground);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("online", onOnline);
  void syncNow();
}

/** Stops syncing. `forget` (on sign-out) also unties this browser from the account. */
export function stopSync({ forget }: { forget: boolean }): void {
  userId = null;
  again = false;
  if (timer) clearTimeout(timer);
  setWriteListener(null);
  document.removeEventListener("visibilitychange", onForeground);
  window.removeEventListener("pagehide", onHide);
  window.removeEventListener("online", onOnline);
  if (forget) {
    unlinkDevice();
    forgetSharing();
  }
  setStatus({ state: "off", lastSyncedAt: null });
}
