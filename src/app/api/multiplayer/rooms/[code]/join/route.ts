import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_RE = /^[0-9]{5}$/;
const MAX_PLAYERS = 12;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { playerName, playerKey } = body as Record<string, unknown>;

  if (typeof playerName !== "string") {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const sanitizedName = playerName.trim().slice(0, 30);
  if (!sanitizedName) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  if (typeof playerKey !== "string" || !UUID_RE.test(playerKey)) {
    return NextResponse.json({ error: "Invalid player key" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up the room
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id, status")
    .eq("code", code)
    .maybeSingle();

  if (roomErr || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.status !== "lobby") {
    return NextResponse.json(
      { error: "Game already started" },
      { status: 409 },
    );
  }

  // Check player count
  const { count } = await supabase
    .from("room_players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  if ((count ?? 0) >= MAX_PLAYERS) {
    return NextResponse.json({ error: "Room is full" }, { status: 409 });
  }

  // Check if already joined (same player_key = reconnect is fine; just return success)
  const { data: existing } = await supabase
    .from("room_players")
    .select("id")
    .eq("room_id", room.id)
    .eq("player_key", playerKey)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ roomCode: code }, { status: 200 });
  }

  const { error: insertErr } = await supabase
    .from("room_players")
    .insert({
      room_id: room.id,
      player_key: playerKey,
      name: sanitizedName,
      points: {},
    });

  if (insertErr) {
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }

  return NextResponse.json({ roomCode: code }, { status: 201 });
}
