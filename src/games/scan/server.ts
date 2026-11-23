import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";

import { getAdmin } from "@/games/online/server";
import { SCAN_SCHEMA, SCAN_SYSTEM } from "./prompt";
import type { ReadSheet } from "./sheet";

/**
 * /api/scan: reads a photo of the paper Kniffelblock with Claude.
 *
 * Open to everyone without an account, so every request is counted before
 * the model is asked: per visitor (a hash of the IP, never the IP itself)
 * and for the whole site, per day. The counts live in Supabase
 * (migration 20261123120000_scan_usage.sql); without it each server
 * instance counts in memory, which still stops a single tab from looping.
 */

export const SCAN_MODEL = process.env.SCAN_MODEL ?? "claude-haiku-5-5";
const PER_VISITOR_PER_DAY = Number(process.env.SCAN_LIMIT_PER_DAY ?? 20);
const GLOBAL_PER_DAY = Number(process.env.SCAN_LIMIT_GLOBAL ?? 2000);

export class ScanError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

let client: Anthropic | null | undefined;
function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  return client;
}

export const scanConfigured = () => getClient() !== null;

/** A stable, anonymous key per visitor and day: the IP never leaves this function. */
export function visitorKey(ip: string, day: string): string {
  const salt = process.env.SCAN_SALT ?? process.env.SUPABASE_SECRET_KEY ?? "wuerfelkarte";
  return createHash("sha256").update(`${salt}:${day}:${ip}`).digest("hex").slice(0, 32);
}

// Fallback without the migration: counts per server instance.
const memory = new Map<string, number>();
let memoryDay = "";

function takeInMemory(key: string, day: string): number {
  if (memoryDay !== day) {
    memory.clear();
    memoryDay = day;
  }
  const mine = memory.get(key) ?? 0;
  const all = memory.get("*") ?? 0;
  if (mine >= PER_VISITOR_PER_DAY || all >= GLOBAL_PER_DAY) return -1;
  memory.set(key, mine + 1);
  memory.set("*", all + 1);
  return PER_VISITOR_PER_DAY - mine - 1;
}

/** Counts one scan; the scans left for this visitor today, or a ScanError when none are. */
export async function takeScan(ip: string): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  const key = visitorKey(ip, day);
  let left: number | null = null;
  const db = getAdmin();
  if (db) {
    const { data, error } = await db.rpc("take_scan", {
      p_key: key,
      p_per_key: PER_VISITOR_PER_DAY,
      p_global: GLOBAL_PER_DAY,
    });
    if (!error && typeof data === "number") left = data;
    else if (error) console.error("scan api: take_scan", error.message);
  }
  if (left === null) left = takeInMemory(key, day);
  if (left < 0) throw new ScanError("limit", 429);
  return left;
}

const MEDIA = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/** Sends the photo to the model and returns what it read. */
export async function readSheet(dataUrl: string): Promise<ReadSheet> {
  const anthropic = getClient();
  if (!anthropic) throw new ScanError("not set up", 503);
  const match = MEDIA.exec(dataUrl);
  if (!match) throw new ScanError("bad image", 400);
  const [, mediaType, data] = match;

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: SCAN_MODEL,
      max_tokens: 4000,
      system: SCAN_SYSTEM,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCAN_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data },
            },
            { type: "text", text: "Transcribe this score card." },
          ],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new ScanError("busy", 503);
    if (err instanceof Anthropic.BadRequestError) {
      console.error("scan api: bad request", err.message);
      throw new ScanError("bad image", 400);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("scan api:", err.status, err.message);
      throw new ScanError("server error", 502);
    }
    throw err;
  }

  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
    throw new ScanError("unreadable", 422);
  }
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  if (!text) throw new ScanError("unreadable", 422);
  let read: ReadSheet;
  try {
    read = JSON.parse(text) as ReadSheet;
  } catch {
    throw new ScanError("unreadable", 422);
  }
  if (!read.is_sheet) throw new ScanError("not a sheet", 422);
  return read;
}
