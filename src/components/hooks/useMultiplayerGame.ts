"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gamemodes } from "../gamemodes/gamemodes";
import { Points } from "./types";
import { calculateScore } from "./useKniffel";
import {
  MultiRoom,
  MultiRoomPlayer,
  MultiRoomStatus,
  RoomPlayerRow,
} from "./multiplayer-types";

const PLAYER_KEY_STORAGE = "kniffel:player-key";

function getOrCreatePlayerKey(): string {
  try {
    const stored = localStorage.getItem(PLAYER_KEY_STORAGE);
    if (stored && /^[0-9a-f-]{36}$/.test(stored)) return stored;
    const key = crypto.randomUUID();
    localStorage.setItem(PLAYER_KEY_STORAGE, key);
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

function rowToPlayer(row: RoomPlayerRow, gamemode: string): MultiRoomPlayer {
  const points = (row.points ?? {}) as Partial<Points>;
  return {
    ...row,
    score: calculateScore(
      points as Points,
      (gamemode as keyof typeof gamemodes) ?? "Wunder"
    ),
  };
}

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export function useMultiplayerGame(roomCode: string) {
  const [room, setRoom] = useState<MultiRoom | null>(null);
  const [players, setPlayers] = useState<MultiRoomPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const myPlayerKey = useMemo(() => getOrCreatePlayerKey(), []);
  const supabaseRef = useRef(createSupabase());

  // Initial load
  const loadRoom = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data: roomRow, error: roomErr } = await supabase
      .from("rooms")
      .select("id, code, gamemode, status, host_player_key")
      .eq("code", roomCode.toUpperCase())
      .maybeSingle();

    if (roomErr || !roomRow) {
      setError("Raum nicht gefunden.");
      setIsLoading(false);
      return;
    }

    setRoom(roomRow as MultiRoom);

    const { data: playerRows } = await supabase
      .from("room_players")
      .select("id, room_id, player_key, name, points, joined_at")
      .eq("room_id", roomRow.id)
      .order("joined_at", { ascending: true });

    setPlayers(
      (playerRows ?? []).map((r) => rowToPlayer(r as RoomPlayerRow, roomRow.gamemode))
    );
    setIsLoading(false);
  }, [roomCode]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Realtime subscriptions
  useEffect(() => {
    if (!room) return;
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`multiplayer:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const updated = payload.new as MultiRoom;
          setRoom((prev) =>
            prev ? { ...prev, status: updated.status as MultiRoomStatus } : prev
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const row = payload.new as RoomPlayerRow;
          setPlayers((prev) => {
            if (prev.some((p) => p.player_key === row.player_key)) return prev;
            return [...prev, rowToPlayer(row, room.gamemode)];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const row = payload.new as RoomPlayerRow;
          setPlayers((prev) =>
            prev.map((p) =>
              p.player_key === row.player_key ? rowToPlayer(row, room.gamemode) : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, room?.gamemode]);

  const updateMyPoints = useCallback(
    async (newPartialPoints: Partial<Record<string, number | "X">>) => {
      if (!room) return;

      // Optimistic update
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.player_key !== myPlayerKey) return p;
          const merged: Record<string, number | "X"> = Object.fromEntries(
            Object.entries({ ...p.points, ...newPartialPoints }).filter(
              (entry): entry is [string, number | "X"] => entry[1] !== undefined
            )
          );
          return {
            ...p,
            points: merged,
            score: calculateScore(
              merged as Points,
              room.gamemode as keyof typeof gamemodes
            ),
          };
        })
      );

      // Compute full merged points to send to server
      const myPlayer = players.find((p) => p.player_key === myPlayerKey);
      const fullPoints = { ...(myPlayer?.points ?? {}), ...newPartialPoints };

      const res = await fetch(
        `/api/multiplayer/rooms/${room.code}/score`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerKey: myPlayerKey, points: fullPoints }),
        }
      );

      if (!res.ok) {
        // Revert optimistic update on failure
        await loadRoom();
      }
    },
    [room, players, myPlayerKey, loadRoom]
  );

  const startGame = useCallback(async () => {
    if (!room) return;
    await fetch(`/api/multiplayer/rooms/${room.code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerKey: myPlayerKey }),
    });
  }, [room, myPlayerKey]);

  return {
    room,
    players,
    myPlayerKey,
    isHost: room?.host_player_key === myPlayerKey,
    isLoading,
    error,
    updateMyPoints,
    startGame,
  };
}
