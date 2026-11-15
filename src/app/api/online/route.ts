import { NextResponse } from "next/server";

import { ApiError, getAdmin, handle, peek } from "@/games/online/server";
import type { OnlineAction } from "@/games/online/types";

/** The largest action is a handful of ids; anything bigger is not one. */
const MAX_BODY = 4096;
const MAX_TOKEN = 8192;

/** Kniffel online: every write goes through here (see src/games/online/server.ts). */
export async function POST(request: Request) {
  const db = getAdmin();
  if (!db) return NextResponse.json({ error: "not set up" }, { status: 503 });

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

  const respond = async (run: () => Promise<unknown>) => {
    try {
      return NextResponse.json(await run());
    } catch (err) {
      if (err instanceof ApiError) return NextResponse.json({ error: err.code }, { status: err.status });
      console.error("online api", err);
      return NextResponse.json({ error: "server error" }, { status: 500 });
    }
  };

  // An invite link shows its game to anyone holding it, before they sign in.
  if (action.type === "peek") return respond(() => peek(db, action.code));

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.length > MAX_TOKEN) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  // Checks the token's signature here with the project's cached public keys
  // instead of asking the auth server on every move (getClaims falls back to
  // that for projects still on the legacy shared secret).
  const { data, error } = await db.auth.getClaims(token);
  const uid = data?.claims.sub;
  if (error || typeof uid !== "string" || !uid) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  return respond(() => handle(db, uid, action));
}
