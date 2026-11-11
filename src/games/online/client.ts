import { readJSON, writeJSON } from "@/games/shared/storage";
import { yatzyStorage } from "@/games/yatzy/storage";
import { getSupabase } from "@/lib/supabase";
import { toMatch } from "./engine";
import type { GameRow, OnlineAction } from "./types";

/** The browser side of /api/online: sends a move with the account's token. */

const MESSAGES: Record<string, string> = {
  "not set up": "Online-Spiele sind noch nicht eingerichtet.",
  "not signed in": "Bitte melde dich an.",
  "no profile": "Wähle zuerst unter Konto einen Namen.",
  busy: "Du bist schon in einem Online-Spiel.",
  "invitee busy": "Jemand davon spielt gerade schon.",
  "not linked": "Nur verknüpfte Mitspieler können eingeladen werden.",
  "bad invitees": "Lade 1 bis 5 Mitspieler ein.",
  "too many": "Höchstens 6 Spieler.",
  "too few": "Mindestens ein Mitspieler muss zugesagt haben.",
  gone: "Dieses Spiel gibt es nicht mehr.",
  "not your turn": "Du bist gerade nicht dran.",
  "no rolls left": "Keine Würfe mehr.",
  "keep one": "Lege mindestens einen weiteren Würfel ab.",
  "bad keep": "Diese Würfel dürfen nicht gehalten werden.",
  "nothing to roll": "Lass mindestens einen Würfel frei.",
  "field not allowed": "Dieses Feld geht gerade nicht.",
  conflict: "Gerade gab es einen anderen Zug. Versuch es nochmal.",
};

const SAVED_KEY = "online:saved";

export class OnlineError extends Error {}

export async function callOnline<T = Record<string, unknown>>(action: OnlineAction): Promise<T> {
  const supabase = getSupabase();
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  if (!token) throw new OnlineError(MESSAGES["not signed in"]);
  let response: Response;
  try {
    response = await fetch("/api/online", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(action),
    });
  } catch {
    throw new OnlineError("Keine Verbindung.");
  }
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new OnlineError(MESSAGES[body.error ?? ""] ?? "Hat nicht geklappt.");
  return body;
}

/**
 * Puts a finished online game into the local Yatzy history (once), where it
 * counts in the statistics; the account sync takes it to other devices.
 */
export function saveOnlineResult(game: GameRow, userId: string): void {
  if (game.status !== "finished" || !game.state) return;
  if (!game.state.seats.some((s) => s.userId === userId)) return;
  // Remembered on this device, so a result deleted from the history stays deleted.
  const saved = readJSON<string[]>(SAVED_KEY, []);
  if (saved.includes(game.id)) return;
  if (!yatzyStorage.loadMatches().some((m) => m.id === game.id)) {
    yatzyStorage.saveMatch(toMatch(game.state, game.id));
  }
  writeJSON(SAVED_KEY, [...saved, game.id].slice(-200));
}
