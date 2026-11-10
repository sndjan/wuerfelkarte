"use client";

import { useCallback, useEffect, useState } from "react";

import { LinksUnavailableError, fetchLinkState, type LinkState } from "@/lib/links/api";
import type { PlayerLink } from "@/lib/links/share";
import { getSupabase } from "@/lib/supabase";

export type LinksStatus =
  | { state: "loading" }
  | { state: "unavailable" }
  | { state: "error" }
  | ({ state: "ready" } & LinkState);

/** The signed-in user's profile, player links and linked profiles; `reload` after a change. */
export function usePlayerLinks(userId: string | null) {
  const [links, setLinks] = useState<LinksStatus>({ state: "loading" });

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    try {
      setLinks({ state: "ready", ...(await fetchLinkState(supabase)) });
    } catch (error) {
      setLinks({ state: error instanceof LinksUnavailableError ? "unavailable" : "error" });
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { links, reload };
}

/** Invites addressed to this user that are still open. */
export const openInvites = (links: PlayerLink[], userId: string) =>
  links.filter((l) => l.status === "pending" && l.inviteeId === userId);
