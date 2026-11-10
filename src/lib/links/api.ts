import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { PlayerLink } from "./share";

/** The player_links migration has not been run yet. */
export class LinksUnavailableError extends Error {}

export const isMissingTable = (error: PostgrestError) =>
  // 42P01: undefined table; PGRST205: not in PostgREST's schema cache; 42883/PGRST202: missing function.
  ["42P01", "PGRST205", "42883", "PGRST202"].includes(error.code);

const fail = (error: PostgrestError): never => {
  if (isMissingTable(error)) throw new LinksUnavailableError(error.message);
  throw new Error(error.message);
};

type LinkRow = {
  id: string;
  owner_id: string;
  owner_email: string;
  player_id: string;
  player_name: string;
  invitee_email: string;
  invitee_id: string | null;
  status: "pending" | "accepted";
};

const toLink = (row: LinkRow): PlayerLink => ({
  id: row.id,
  ownerId: row.owner_id,
  ownerEmail: row.owner_email,
  playerId: row.player_id,
  playerName: row.player_name,
  inviteeEmail: row.invitee_email,
  inviteeId: row.invitee_id,
  status: row.status,
});

/** Links this account made and the ones addressed to it (RLS decides). */
export async function fetchLinks(client: SupabaseClient): Promise<PlayerLink[]> {
  const { data, error } = await client
    .from("player_links")
    .select("id, owner_id, owner_email, player_id, player_name, invitee_email, invitee_id, status")
    .order("created_at");
  if (error) fail(error);
  return ((data ?? []) as LinkRow[]).map(toLink);
}

/** German message for a failed invite, or null when it worked. */
export async function invitePlayer(
  client: SupabaseClient,
  playerId: string,
  playerName: string,
  email: string,
): Promise<string | null> {
  const { error } = await client.rpc("invite_player", {
    p_player_id: playerId,
    p_player_name: playerName,
    p_email: email,
  });
  if (!error) return null;
  if (isMissingTable(error)) return "Verknüpfen ist noch nicht eingerichtet.";
  if (error.message.includes("invalid email")) return "Bitte eine gültige E-Mail eingeben.";
  if (error.message.includes("own email")) return "Das ist deine eigene E-Mail.";
  if (error.message.includes("too many")) return "Du hast schon sehr viele Spieler verknüpft.";
  return "Das hat nicht geklappt. Bitte erneut versuchen.";
}

export async function acceptLink(client: SupabaseClient, linkId: string): Promise<boolean> {
  const { error } = await client.rpc("accept_player_link", { p_link_id: linkId });
  return !error;
}

/** Ends a link from either side, or declines an invite. */
export async function removeLink(client: SupabaseClient, linkId: string): Promise<boolean> {
  const { error } = await client.from("player_links").delete().eq("id", linkId);
  return !error;
}
