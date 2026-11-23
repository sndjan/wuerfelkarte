import { NextResponse } from "next/server";

import { readSheet, scanConfigured, ScanError, takeScan } from "@/games/scan/server";

/** The browser sends the photo scaled down to ~1600 px, a few hundred KB. */
const MAX_BODY = 3_000_000;

export const maxDuration = 60;

/** Reads a photo of the paper Kniffelblock (see src/games/scan/server.ts). */
export async function POST(request: Request) {
  if (!scanConfigured()) return NextResponse.json({ error: "not set up" }, { status: 503 });

  let image: unknown;
  try {
    const body = await request.text();
    if (body.length > MAX_BODY) return NextResponse.json({ error: "too big" }, { status: 413 });
    image = (JSON.parse(body) as { image?: unknown }).image;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (typeof image !== "string") return NextResponse.json({ error: "bad request" }, { status: 400 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  try {
    const left = await takeScan(ip);
    const sheet = await readSheet(image);
    return NextResponse.json({ sheet, left });
  } catch (err) {
    if (err instanceof ScanError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error("scan api", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
