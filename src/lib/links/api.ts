import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { PlayerLink, Profile } from "./share";

/** The player_links or profiles migration has not been run yet. */
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
  player_id: string;
  player_name: string;
  invitee_id: string;
  status: "pending" | "accepted";
};

type ProfileRow = { user_id: string; name: string; tag: string };

const toProfile = (row: ProfileRow): Profile => ({ userId: row.user_id, name: row.name, tag: row.tag });

export type LinkState = {
  links: PlayerLink[];
  /** The user's own profile and those of everyone they are linked with. */
  profiles: Map<string, Profile>;
};

/** Links this account made and the ones addressed to it, with the profiles behind them (RLS decides). */
export async function fetchLinkState(client: SupabaseClient): Promise<LinkState> {
  const [links, profiles] = await Promise.all([
    client.from("player_links").select("id, owner_id, player_id, player_name, invitee_id, status").order("created_at"),
    client.from("profiles").select("user_id, name, tag"),
  ]);
  if (links.error) fail(links.error);
  if (profiles.error) fail(profiles.error);
  return {
    links: ((links.data ?? []) as LinkRow[]).map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      playerId: row.player_id,
      playerName: row.player_name,
      inviteeId: row.invitee_id,
      status: row.status,
    })),
    profiles: new Map(((profiles.data ?? []) as ProfileRow[]).map((row) => [row.user_id, toProfile(row)])),
  };
}

/** Sets the user's name; returns the profile with its tag, or a German error. */
export async function setProfileName(
  client: SupabaseClient,
  name: string,
): Promise<{ profile: Profile } | { error: string }> {
  const { data, error } = await client.rpc("set_profile_name", { p_name: name });
  if (!error) return { profile: toProfile(data as ProfileRow) };
  if (isMissingTable(error)) return { error: "Noch nicht eingerichtet." };
  if (error.message.includes("invalid name")) return { error: "1–24 Zeichen, ohne #." };
  if (error.message.includes("name taken")) return { error: "Name zu beliebt. Nimm einen anderen." };
  return { error: "Hat nicht geklappt." };
}

/** German message for a failed invite, or null when it worked. */
export async function invitePlayer(
  client: SupabaseClient,
  playerId: string,
  playerName: string,
  handle: string,
): Promise<string | null> {
  const { error } = await client.rpc("invite_player", {
    p_player_id: playerId,
    p_player_name: playerName,
    p_handle: handle.trim(),
  });
  if (!error) return null;
  if (isMissingTable(error)) return "Noch nicht eingerichtet.";
  if (error.message.includes("invalid handle")) return "Format: Name#1234";
  if (error.message.includes("unknown handle")) return "Konto-ID nicht gefunden.";
  if (error.message.includes("own handle")) return "Das bist du selbst.";
  if (error.message.includes("no profile")) return "Erst oben einen Namen wählen.";
  if (error.message.includes("too many")) return "Zu viele Verknüpfungen.";
  return "Hat nicht geklappt.";
}

export async function acceptLink(client: SupabaseClient, linkId: string): Promise<boolean> {
  const { error } = await client.rpc("accept_player_link", { p_link_id: linkId });
  return !error;
}

/** Records the owner of an accepted invite as one of this user's roster players. */
export async function linkBack(
  client: SupabaseClient,
  linkId: string,
  playerId: string,
  playerName: string,
): Promise<boolean> {
  const { error } = await client.rpc("link_back", {
    p_link_id: linkId,
    p_player_id: playerId,
    p_player_name: playerName,
  });
  return !error;
}

/** Ends a link from either side (both directions go), or declines an invite. */
export async function removeLink(client: SupabaseClient, linkId: string): Promise<boolean> {
  const { error } = await client.from("player_links").delete().eq("id", linkId);
  return !error;
}
