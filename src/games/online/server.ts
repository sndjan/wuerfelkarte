import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";

import { gamemodes } from "@/games/yatzy/gamemodes";
import { selectMissions } from "@/games/yatzy/gamemodes/chaoswunder";
import {
  applyCorrection,
  applyEntry,
  applyLeave,
  applyReveal,
  applyRoll,
  digitalEntry,
  MoveError,
  newState,
  physicalEntry,
  type Cell,
  type OnlineState,
} from "./engine";
import { MAX_PLAYERS, type GameRow, type OnlineAction, type PlayerRow } from "./types";

/**
 * The server half of Kniffel online, run by /api/online. It is the only
 * writer of the online tables: it checks who is asking, whether the move is
 * allowed (with the same engine the board uses) and rolls the dice.
 */

export class ApiError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

const deny = (code: string, status = 400): never => {
  throw new ApiError(code, status);
};

let admin: SupabaseClient | null | undefined;

/** The client with the secret key, or null when the server has none. */
export function getAdmin(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  admin = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return admin;
}

const UNIQUE_VIOLATION = "23505";

const check = <T>({ data, error }: { data: T; error: PostgrestError | null }): T => {
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) deny("not set up", 503);
    if (error.code === UNIQUE_VIOLATION) deny("busy", 409);
    throw new Error(error.message);
  }
  return data;
};

/** Random numbers for the dice from the platform's cryptographic source. */
const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

type Profile = { user_id: string; name: string; tag: string };

async function profilesOf(db: SupabaseClient, ids: string[]): Promise<Map<string, Profile>> {
  if (ids.length === 0) return new Map();
  const rows = check(await db.from("profiles").select("user_id, name, tag").in("user_id", ids)) as Profile[];
  return new Map(rows.map((p) => [p.user_id, p]));
}

/** Accounts with an accepted link to this one, in either direction. */
async function linkedIds(db: SupabaseClient, uid: string): Promise<string[]> {
  const rows = check(
    await db
      .from("player_links")
      .select("owner_id, invitee_id")
      .eq("status", "accepted")
      .or(`owner_id.eq.${uid},invitee_id.eq.${uid}`),
  ) as { owner_id: string; invitee_id: string }[];
  return [...new Set(rows.map((r) => (r.owner_id === uid ? r.invitee_id : r.owner_id)))];
}

async function busyIds(db: SupabaseClient, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = check(
    await db.from("online_game_players").select("user_id").eq("active", true).in("user_id", ids),
  ) as { user_id: string }[];
  return new Set(rows.map((r) => r.user_id));
}

async function loadGame(db: SupabaseClient, gameId: string): Promise<{ game: GameRow; players: PlayerRow[] }> {
  const game = check(await db.from("online_games").select("*").eq("id", gameId).maybeSingle()) as GameRow | null;
  if (!game) return deny("gone", 404);
  const players = check(
    await db.from("online_game_players").select("*").eq("game_id", gameId).order("invited_at"),
  ) as PlayerRow[];
  return { game, players };
}

/**
 * Writes a change to a game only if nobody else wrote in between; on a clash
 * it reads the game again and retries the change.
 */
async function mutate(
  db: SupabaseClient,
  gameId: string,
  change: (game: GameRow, players: PlayerRow[]) => Partial<GameRow> | null,
): Promise<GameRow> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { game, players } = await loadGame(db, gameId);
    const patch = change(game, players);
    if (!patch) return game;
    const updated = check(
      await db
        .from("online_games")
        .update({ ...patch, version: game.version + 1, updated_at: new Date().toISOString() })
        .eq("id", gameId)
        .eq("version", game.version)
        .select("*"),
    ) as GameRow[];
    if (updated.length === 1) return updated[0];
  }
  return deny("conflict", 409);
}

const ownProfile = async (db: SupabaseClient, uid: string): Promise<Profile> => {
  const profile = (await profilesOf(db, [uid])).get(uid);
  return profile ?? deny("no profile");
};

/** Drops the user's open invites: they are busy now. */
const dropInvites = async (db: SupabaseClient, uid: string) =>
  check(await db.from("online_game_players").delete().eq("user_id", uid).eq("status", "invited"));

const deactivateAll = async (db: SupabaseClient, gameId: string) =>
  check(await db.from("online_game_players").update({ active: false }).eq("game_id", gameId));

async function inviteAll(db: SupabaseClient, uid: string, gameId: string, userIds: string[]) {
  const linked = new Set(await linkedIds(db, uid));
  if (!userIds.every((id) => linked.has(id))) deny("not linked");
  const busy = await busyIds(db, userIds);
  if (userIds.some((id) => busy.has(id))) deny("invitee busy", 409);
  const profiles = await profilesOf(db, userIds);
  const rows = userIds.map((id) => {
    const profile = profiles.get(id) ?? deny("not linked");
    return { game_id: gameId, user_id: id, name: profile.name, tag: profile.tag, status: "invited" };
  });
  if (rows.length > 0) check(await db.from("online_game_players").upsert(rows, { ignoreDuplicates: true }));
}

const seatOf = (state: OnlineState, uid: string) => {
  const index = state.seats.findIndex((s) => s.userId === uid);
  return index === -1 ? deny("not in game", 403) : index;
};

const asCell = (value: unknown): Cell =>
  value === "X" ? "X" : typeof value === "number" && Number.isInteger(value) ? value : deny("bad value");

/** Ends a game that just finished (or that everyone left). */
const closeIfDone = async (db: SupabaseClient, game: GameRow) => {
  if (game.status !== "running") await deactivateAll(db, game.id);
};

/** Applies a move to the running game's state. */
function playMove(game: GameRow, move: (state: OnlineState) => OnlineState): Partial<GameRow> {
  if (game.status !== "running" || !game.state) return deny("not running", 409);
  let state: OnlineState;
  try {
    state = move(game.state);
  } catch (error) {
    if (error instanceof MoveError) return deny(error.message);
    throw error;
  }
  return { state, status: state.finishedAt !== null ? "finished" : "running" };
}

/** Takes a player out of a running game; the host role moves on if needed. */
function leaveRunning(game: GameRow, userId: string): Partial<GameRow> {
  const patch = playMove(game, (state) => applyLeave(state, seatOf(state, userId)));
  const state = patch.state as OnlineState;
  let hostId = game.host_id;
  if (hostId === userId) {
    hostId = state.seats.find((s) => !s.left)?.userId ?? hostId;
  }
  return { ...patch, host_id: hostId };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The request body is untrusted: ids must be ids and lists must be lists. */
function validate(action: OnlineAction) {
  const ids = [
    "gameId" in action ? action.gameId : undefined,
    "userId" in action ? action.userId : undefined,
    ...("userIds" in action ? (Array.isArray(action.userIds) ? action.userIds : [null]) : []),
    ...("invitees" in action ? (Array.isArray(action.invitees) ? action.invitees : [null]) : []),
  ];
  if (ids.some((id) => id !== undefined && (typeof id !== "string" || !UUID.test(id)))) deny("bad request");
  if ("field" in action && typeof action.field !== "string") deny("bad request");
  if (action.type === "roll") {
    if (!Array.isArray(action.keep) || !action.keep.every((k) => typeof k === "boolean")) deny("bad request");
    if (action.preset !== undefined && !Array.isArray(action.preset)) deny("bad request");
  }
}

export async function handle(db: SupabaseClient, uid: string, action: OnlineAction): Promise<unknown> {
  validate(action);
  switch (action.type) {
    case "candidates": {
      const ids = await linkedIds(db, uid);
      const [profiles, busy] = await Promise.all([profilesOf(db, ids), busyIds(db, ids)]);
      return {
        candidates: ids
          .filter((id) => profiles.has(id))
          .map((id) => ({ userId: id, name: profiles.get(id)!.name, tag: profiles.get(id)!.tag, busy: busy.has(id) }))
          .sort((a, b) => a.name.localeCompare(b.name, "de")),
      };
    }

    case "create": {
      const { gamemode, diceMode, invitees } = action;
      if (!(gamemode in gamemodes)) deny("bad gamemode");
      if (diceMode !== "digital" && diceMode !== "physical") deny("bad dice mode");
      const unique = [...new Set(invitees)];
      if (unique.length < 1 || unique.length > MAX_PLAYERS - 1 || unique.includes(uid)) deny("bad invitees");
      const profile = await ownProfile(db, uid);
      if ((await busyIds(db, [uid])).size > 0) deny("busy", 409);

      const game = check(
        await db
          .from("online_games")
          .insert({
            host_id: uid,
            gamemode,
            dice_mode: diceMode,
            settings: {
              missionEveryRound: Boolean(action.missionEveryRound),
              balancedMode: Boolean(action.balancedMode),
            },
          })
          .select("*")
          .single(),
      ) as GameRow;
      try {
        check(
          await db.from("online_game_players").insert({
            game_id: game.id,
            user_id: uid,
            name: profile.name,
            tag: profile.tag,
            status: "accepted",
            active: true,
          }),
        );
        await inviteAll(db, uid, game.id, unique);
      } catch (error) {
        await db.from("online_games").delete().eq("id", game.id);
        throw error;
      }
      await dropInvites(db, uid);
      return { gameId: game.id };
    }

    case "invite": {
      const { game, players } = await loadGame(db, action.gameId);
      if (game.host_id !== uid) deny("not host", 403);
      if (game.status !== "lobby") deny("not lobby", 409);
      const fresh = [...new Set(action.userIds)].filter((id) => !players.some((p) => p.user_id === id));
      if (players.length + fresh.length > MAX_PLAYERS) deny("too many");
      await inviteAll(db, uid, game.id, fresh);
      return {};
    }

    case "respond": {
      const { game, players } = await loadGame(db, action.gameId);
      const me = players.find((p) => p.user_id === uid && p.status === "invited");
      if (!me) return deny("gone", 404);
      if (!action.accept || game.status !== "lobby") {
        check(await db.from("online_game_players").delete().eq("game_id", game.id).eq("user_id", uid));
        return action.accept ? deny("gone", 404) : {};
      }
      check(
        await db
          .from("online_game_players")
          .update({ status: "accepted", active: true, updated_at: new Date().toISOString() })
          .eq("game_id", game.id)
          .eq("user_id", uid),
      );
      await dropInvites(db, uid);
      return { gameId: game.id };
    }

    case "start": {
      const { game: before, players } = await loadGame(db, action.gameId);
      if (before.host_id !== uid) deny("not host", 403);
      const accepted = players.filter((p) => p.status === "accepted");
      if (accepted.length < 2) deny("too few");
      const profiles = await profilesOf(db, accepted.map((p) => p.user_id));
      const seats = accepted
        .map((p) => ({ userId: p.user_id, name: profiles.get(p.user_id)?.name ?? p.name, order: secureRandom() }))
        .sort((a, b) => a.order - b.order)
        .map(({ userId, name }) => ({ userId, name }));
      const interval = before.settings.missionEveryRound ? 1 : 2;
      const game = await mutate(db, before.id, (g) => {
        if (g.status !== "lobby") return deny("not lobby", 409);
        return {
          status: "running",
          state: newState({
            gamemode: g.gamemode,
            diceMode: g.dice_mode,
            seats,
            missions: g.gamemode === "Chaoswunder" ? selectMissions(interval, Boolean(g.settings.balancedMode)) : [],
            missionInterval: interval,
          }),
        };
      });
      // Invites nobody answered are withdrawn, and so is anyone who joined
      // after the seats were drawn.
      const seated = seats.map((s) => s.userId);
      check(
        await db
          .from("online_game_players")
          .delete()
          .eq("game_id", game.id)
          .not("user_id", "in", `(${seated.join(",")})`),
      );
      return { game };
    }

    case "roll": {
      const game = await mutate(db, action.gameId, (g) => {
        if (g.dice_mode !== "digital") deny("no dice");
        return playMove(g, (state) =>
          applyRoll(state, seatOf(state, uid), { keep: action.keep ?? [], preset: action.preset ?? [] }, secureRandom),
        );
      });
      return { game };
    }

    case "score": {
      const game = await mutate(db, action.gameId, (g) =>
        playMove(g, (state) => {
          const seat = seatOf(state, uid);
          const entry =
            state.diceMode === "digital"
              ? digitalEntry(state, action.field)
              : physicalEntry(state, action.field, asCell(action.value), Boolean(action.extraWunder));
          return applyEntry(state, seat, action.field, entry);
        }),
      );
      await closeIfDone(db, game);
      return { game };
    }

    case "correct": {
      const game = await mutate(db, action.gameId, (g) => {
        if (g.host_id !== uid) deny("not host", 403);
        return playMove(g, (state) =>
          applyCorrection(state, seatOf(state, action.userId), action.field, asCell(action.value)),
        );
      });
      return { game };
    }

    case "leave":
    case "remove": {
      const target = action.type === "leave" ? uid : action.userId;
      const { game: before } = await loadGame(db, action.gameId);
      if (action.type === "remove" && before.host_id !== uid) deny("not host", 403);
      if (action.type === "remove" && target === uid) deny("bad target");

      if (before.status === "lobby") {
        if (target === before.host_id) {
          await mutate(db, before.id, (g) => (g.status === "lobby" ? { status: "cancelled" } : null));
          await deactivateAll(db, before.id);
        } else {
          check(await db.from("online_game_players").delete().eq("game_id", before.id).eq("user_id", target));
        }
        return {};
      }
      if (before.status !== "running") return {};

      const game = await mutate(db, before.id, (g) => leaveRunning(g, target));
      check(
        await db
          .from("online_game_players")
          .update({ status: "left", active: false, updated_at: new Date().toISOString() })
          .eq("game_id", game.id)
          .eq("user_id", target),
      );
      await closeIfDone(db, game);
      return { game };
    }

    case "reveal": {
      const game = await mutate(db, action.gameId, (g) => {
        if (g.host_id !== uid) deny("not host", 403);
        if ((g.status !== "running" && g.status !== "finished") || !g.state) return deny("not running", 409);
        if (g.state.revealedAt != null) return null;
        return { state: applyReveal(g.state) };
      });
      return { game };
    }

    case "cancel": {
      const game = await mutate(db, action.gameId, (g) => {
        if (g.host_id !== uid) deny("not host", 403);
        if (g.status !== "lobby" && g.status !== "running") return null;
        return { status: "cancelled" };
      });
      await deactivateAll(db, game.id);
      return {};
    }

    default:
      return deny("unknown action");
  }
}
