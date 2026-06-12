import { gamemodes } from "@/components/gamemodes/gamemodes";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Unambiguous chars: no O/0, I/1, l
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { gamemode, playerName, playerKey } = body as Record<string, unknown>;

  // Validate gamemode
  if (typeof gamemode !== "string" || !Object.keys(gamemodes).includes(gamemode)) {
    return NextResponse.json({ error: "Invalid gamemode" }, { status: 400 });
  }

  // Validate and sanitize player name
  if (typeof playerName !== "string") {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const sanitizedName = playerName.trim().slice(0, 30);
  if (!sanitizedName) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  // Validate player key (UUID v4)
  if (typeof playerKey !== "string" || !UUID_RE.test(playerKey)) {
    return NextResponse.json({ error: "Invalid player key" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Generate a unique room code (retry on collision)
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRoomCode();
    const { data, error: codeCheckErr } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();
    if (codeCheckErr) {
      console.error("[multiplayer] code check error:", codeCheckErr);
      return NextResponse.json({ error: "DB error", detail: codeCheckErr.message }, { status: 500 });
    }
    if (!data) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return NextResponse.json({ error: "Failed to generate room code" }, { status: 500 });
  }

  // Create the room
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .insert({ code, gamemode, host_player_key: playerKey, status: "lobby" })
    .select("id")
    .single();

  if (roomErr || !room) {
    console.error("[multiplayer] create room error:", roomErr);
    return NextResponse.json({ error: "Failed to create room", detail: roomErr?.message }, { status: 500 });
  }

  // Add the host as first player
  const { error: playerErr } = await supabase
    .from("room_players")
    .insert({ room_id: room.id, player_key: playerKey, name: sanitizedName, points: {} });

  if (playerErr) {
    return NextResponse.json({ error: "Failed to add player" }, { status: 500 });
  }

  return NextResponse.json({ roomCode: code }, { status: 201 });
}
