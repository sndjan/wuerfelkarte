"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { saveOnlineResult } from "../client";
import type { GameRow, PlayerRow } from "../types";

export type GameWithPlayers = GameRow & { online_game_players: PlayerRow[] };

export type MyOnline =
  | { state: "loading" }
  | { state: "signed-out" }
  | { state: "unavailable" }
  | { state: "error" }
  | {
      state: "ready";
      /** The lobby or running game this account is in. */
      active: GameWithPlayers | null;
      /** Open invites to games in their lobby. */
      invites: GameWithPlayers[];
    };

const isMissing = (code?: string) => ["42P01", "PGRST205", "PGRST200"].includes(code ?? "");

/** Refetches at most every `ms`, so a burst of Realtime events costs one read. */
function useThrottled(fn: () => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      latest.current();
    }, ms);
  }, [ms]);
}

/** Reloads when the app comes back to the foreground or online. */
function useWakeReload(reload: () => void) {
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", reload);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", reload);
    };
  }, [reload]);
}

/**
 * The signed-in account's online games: invites, the game it is in, and
 * finished ones, which land in the Yatzy history. Live over Realtime.
 */
export function useMyOnline(): MyOnline & { reload: () => void } {
  const { user, loading, available } = useAuth();
  const userId = user?.id ?? null;
  const [data, setData] = useState<MyOnline>({ state: "loading" });

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    const { data: rows, error } = await supabase
      .from("online_game_players")
      .select("status, online_games(*, online_game_players(*))")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) {
      setData({ state: isMissing(error.code) ? "unavailable" : "error" });
      return;
    }
    const mine = (rows ?? []) as unknown as { status: PlayerRow["status"]; online_games: GameWithPlayers | null }[];
    let active: GameWithPlayers | null = null;
    const invites: GameWithPlayers[] = [];
    for (const row of mine) {
      const game = row.online_games;
      if (!game) continue;
      if (row.status === "invited" && game.status === "lobby") invites.push(game);
      if (row.status === "accepted" && (game.status === "lobby" || game.status === "running")) active ??= game;
      saveOnlineResult(game, userId);
    }
    setData({ state: "ready", active, invites });
  }, [userId]);

  const throttled = useThrottled(() => void reload(), 400);
  useWakeReload(throttled);

  useEffect(() => {
    if (loading) return;
    if (!available) {
      setData({ state: "unavailable" });
      return;
    }
    if (!userId) {
      setData({ state: "signed-out" });
      return;
    }
    void reload();
    const supabase = getSupabase();
    if (!supabase) return;
    const channel = supabase
      .channel(`online-mine:${userId}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "online_game_players", filter: `user_id=eq.${userId}` }, throttled)
      .on("postgres_changes", { event: "*", schema: "public", table: "online_games" }, throttled)
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [userId, loading, available, reload, throttled]);

  return { ...data, reload: throttled };
}

export type GameLoad =
  | { state: "loading" }
  | { state: "gone" }
  | { state: "ready"; game: GameRow; players: PlayerRow[] };

/** What the player on turn holds before rolling, sent live to the others. */
export type LiveHolds = { turn: string; rolls: number; keep: boolean[]; preset?: number[] };

/** One online game, live: the row, its players, and the live holds of the player on turn. */
export function useOnlineGame(gameId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [load, setLoad] = useState<GameLoad>({ state: "loading" });
  const [holds, setHolds] = useState<LiveHolds | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const version = useRef(-1);

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    const [game, players] = await Promise.all([
      supabase.from("online_games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("online_game_players").select("*").eq("game_id", gameId).order("invited_at"),
    ]);
    if (game.error || players.error) return;
    if (!game.data) {
      setLoad({ state: "gone" });
      return;
    }
    const row = game.data as GameRow;
    version.current = Math.max(version.current, row.version);
    setLoad({ state: "ready", game: row, players: (players.data ?? []) as PlayerRow[] });
    saveOnlineResult(row, userId);
  }, [gameId, userId]);

  /** A row the API just returned: shown at once, unless Realtime brought a newer one. */
  const accept = useCallback(
    (row: GameRow) => {
      if (row.version < version.current) return;
      version.current = row.version;
      setLoad((prev) => (prev.state === "ready" ? { ...prev, game: row } : prev));
      if (userId) saveOnlineResult(row, userId);
    },
    [userId],
  );

  const throttled = useThrottled(() => void reload(), 250);
  useWakeReload(throttled);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    void reload();
    const channel = supabase
      .channel(`online-game:${gameId}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "online_games", filter: `id=eq.${gameId}` }, (payload) => {
        const row = payload.new as GameRow | undefined;
        if (row && "version" in row && row.state !== undefined) accept(row);
        else throttled();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "online_game_players", filter: `game_id=eq.${gameId}` }, throttled)
      .on("broadcast", { event: "holds" }, ({ payload }) => setHolds(payload as LiveHolds))
      .subscribe();
    channelRef.current = channel;
    // Realtime can miss events (a sleeping phone); a slow poll catches up.
    const poll = setInterval(throttled, 15_000);
    return () => {
      clearInterval(poll);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [gameId, userId, reload, throttled, accept]);

  const sendHolds = useCallback((next: LiveHolds) => {
    void channelRef.current?.send({ type: "broadcast", event: "holds", payload: next });
  }, []);

  return { load, userId, holds, sendHolds, accept, reload: throttled };
}
