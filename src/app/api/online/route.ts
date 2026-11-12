import { NextResponse } from "next/server";

import { ApiError, getAdmin, handle } from "@/games/online/server";
import type { OnlineAction } from "@/games/online/types";

/** The largest action is a handful of ids; anything bigger is not one. */
const MAX_BODY = 4096;
const MAX_TOKEN = 8192;

/** Kniffel online: every write goes through here (see src/games/online/server.ts). */
export async function POST(request: Request) {
  const db = getAdmin();
  if (!db) return NextResponse.json({ error: "not set up" }, { status: 503 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.length > MAX_TOKEN) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let action: OnlineAction;
  try {
    const body = await request.text();
    if (body.length > MAX_BODY) return NextResponse.json({ error: "bad request" }, { status: 413 });
    action = JSON.parse(body) as OnlineAction;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!action || typeof action !== "object" || Array.isArray(action) || typeof action.type !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await handle(db, data.user.id, action));
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error("online api", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
