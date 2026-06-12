import { gamemodes } from "@/components/gamemodes/gamemodes";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_RE = /^[A-Z0-9]{6}$/;

function isValidPoints(
  points: unknown,
  gamemode: string
): points is Record<string, number | "X"> {
  if (!points || typeof points !== "object" || Array.isArray(points)) return false;
  const config = gamemodes[gamemode as keyof typeof gamemodes];
  if (!config) return false;

  for (const [key, value] of Object.entries(points as Record<string, unknown>)) {
    const field = config.fields.find((f) => f.key === key);
    if (!field) return false;

    if (value === "X" || value === 0) continue;

    const options = field.options ?? [];
    if (typeof value !== "number" || !options.includes(value)) return false;
  }
  return true;
}

export async function PATCH(
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

  const { playerKey, points } = body as Record<string, unknown>;

  if (typeof playerKey !== "string" || !UUID_RE.test(playerKey)) {
    return NextResponse.json({ error: "Invalid player key" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch room to get gamemode for validation
  const { data: room } = await supabase
    .from("rooms")
    .select("id, gamemode, status")
    .eq("code", code)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.status !== "playing") {
    return NextResponse.json({ error: "Game not in progress" }, { status: 409 });
  }

  if (!isValidPoints(points, room.gamemode)) {
    return NextResponse.json({ error: "Invalid points" }, { status: 400 });
  }

  // Update only the row belonging to this player — if player_key doesn't match, 0 rows update
  const { error: updateErr, count } = await supabase
    .from("room_players")
    .update({ points })
    .eq("room_id", room.id)
    .eq("player_key", playerKey);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
  }

  if (count === 0) {
    return NextResponse.json({ error: "Player not in room" }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
