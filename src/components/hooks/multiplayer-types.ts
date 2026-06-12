export type MultiRoomStatus = "lobby" | "playing" | "finished";

export type MultiRoom = {
  id: string;
  code: string;
  gamemode: string;
  status: MultiRoomStatus;
  host_player_key: string;
};

export type MultiRoomPlayer = {
  id: string;
  room_id: string;
  player_key: string;
  name: string;
  points: Record<string, number | "X">;
  score: number;
  joined_at: string;
};

/** Shape of a room_players row returned by Supabase (score is computed, not stored) */
export type RoomPlayerRow = Omit<MultiRoomPlayer, "score">;
