import { readJSON, writeJSON, removeKey } from "@/games/shared/storage";

/**
 * The roster entry that is the signed-in user. It takes the account's name,
 * like a linked player does. Synced with the account, so it holds on every
 * device.
 */
const SELF_KEY = "wuerfelkarte:self";

export const loadSelfPlayerId = (): string | null => {
  const id = readJSON<string | null>(SELF_KEY, null);
  return typeof id === "string" ? id : null;
};

export const saveSelfPlayerId = (id: string | null): void =>
  id === null ? removeKey(SELF_KEY) : writeJSON(SELF_KEY, id);
