import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_RE = /^[0-9]{5}$/;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
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

  const { playerKey } = body as Record<string, unknown>;

  if (typeof playerKey !== "string" || !UUID_RE.test(playerKey)) {
    return NextResponse.json({ error: "Invalid player key" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, status, host_player_key")
    .eq("code", code)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.status !== "lobby") {
    return NextResponse.json({ error: "Game already started" }, { status: 409 });
  }

  if (room.host_player_key !== playerKey) {
    return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
  }

  // Require at least 2 players
  const { count } = await supabase
    .from("room_players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);

  if ((count ?? 0) < 2) {
    return NextResponse.json({ error: "Need at least 2 players to start" }, { status: 409 });
  }

  const { error: updateErr } = await supabase
    .from("rooms")
    .update({ status: "playing" })
    .eq("id", room.id);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
