import { beforeEach, describe, expect, it } from "vitest";

import { FakeDb } from "./fakeDb";
import { ApiError, handle } from "./server";
import type { GameRow, OnlineAction, PlayerRow } from "./types";

const JAN = "00000000-0000-4000-8000-000000000001";
const TIM = "00000000-0000-4000-8000-000000000002";
const EVA = "00000000-0000-4000-8000-000000000003";
const STRANGER = "00000000-0000-4000-8000-000000000004";

let db: FakeDb;

beforeEach(() => {
  db = new FakeDb();
  db.tables.profiles = [
    { user_id: JAN, name: "Jan", tag: "4821" },
    { user_id: TIM, name: "Tim", tag: "0193" },
    { user_id: EVA, name: "Eva", tag: "1111" },
    { user_id: STRANGER, name: "Fremd", tag: "2222" },
  ];
  db.tables.player_links = [
    { owner_id: JAN, invitee_id: TIM, status: "accepted" },
    { owner_id: EVA, invitee_id: JAN, status: "accepted" },
    { owner_id: JAN, invitee_id: STRANGER, status: "pending" },
  ];
});

const act = <T = Record<string, unknown>>(uid: string, action: OnlineAction) =>
  handle(db.client(), uid, action) as Promise<T>;

const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return "ok";
  } catch (error) {
    if (error instanceof ApiError) return error.code;
    throw error;
  }
};

const game = (id: string) => db.tables.online_games.find((g) => g.id === id) as GameRow;
const players = (id: string) => (db.tables.online_game_players as PlayerRow[]).filter((p) => p.game_id === id);

async function startedGame(diceMode: "digital" | "physical" = "digital", gamemode = "Wunder") {
  const { gameId } = await act<{ gameId: string }>(JAN, { type: "create", gamemode, diceMode, invitees: [TIM] });
  await act(TIM, { type: "respond", gameId, accept: true });
  await act(JAN, { type: "start", gameId });
  return gameId;
}

describe("invites", () => {
  it("lists linked accounts in both directions, never pending ones", async () => {
    const { candidates } = await act<{ candidates: { name: string; busy: boolean }[] }>(JAN, { type: "candidates" });
    expect(candidates.map((c) => c.name)).toEqual(["Eva", "Tim"]);
  });

  it("creates a lobby with the host in and the invitees asked", async () => {
    const { gameId } = await act<{ gameId: string }>(JAN, {
      type: "create",
      gamemode: "Battle",
      diceMode: "physical",
      invitees: [TIM, EVA],
    });
    expect(game(gameId).status).toBe("lobby");
    expect(players(gameId).map((p) => [p.name, p.status, p.active])).toEqual([
      ["Jan", "accepted", true],
      ["Tim", "invited", false],
      ["Eva", "invited", false],
    ]);
  });

  it("refuses accounts that are not linked", async () => {
    expect(
      await code(act(JAN, { type: "create", gamemode: "Wunder", diceMode: "digital", invitees: [STRANGER] })),
    ).toBe("not linked");
    expect(db.tables.online_games).toHaveLength(0);
  });

  it("allows one game at a time and shows busy players as busy", async () => {
    await act(JAN, { type: "create", gamemode: "Wunder", diceMode: "digital", invitees: [TIM] });
    expect(await code(act(JAN, { type: "create", gamemode: "Wunder", diceMode: "digital", invitees: [EVA] }))).toBe(
      "busy",
    );
    // Eva's game cannot invite Jan, who is hosting.
    expect(await code(act(EVA, { type: "create", gamemode: "Wunder", diceMode: "digital", invitees: [JAN] }))).toBe(
      "invitee busy",
    );
    const { candidates } = await act<{ candidates: { name: string; busy: boolean }[] }>(EVA, { type: "candidates" });
    expect(candidates).toEqual([expect.objectContaining({ name: "Jan", busy: true })]);
  });

  it("drops other invites once a player accepts one", async () => {
    const first = await act<{ gameId: string }>(JAN, { type: "create", gamemode: "Wunder", diceMode: "digital", invitees: [TIM] });
    db.tables.player_links.push({ owner_id: EVA, invitee_id: TIM, status: "accepted" });
    const second = await act<{ gameId: string }>(EVA, { type: "create", gamemode: "Wunder", diceMode: "digital", invitees: [TIM] });
    await act(TIM, { type: "respond", gameId: second.gameId, accept: true });
    expect(players(first.gameId).map((p) => p.user_id)).toEqual([JAN]);
    expect(await code(act(TIM, { type: "respond", gameId: first.gameId, accept: true }))).toBe("gone");
  });

  it("declining deletes the invite", async () => {
    const { gameId } = await act<{ gameId: string }>(JAN, { type: "create", gamemode: "Wunder", diceMode: "digital", invitees: [TIM] });
    await act(TIM, { type: "respond", gameId, accept: false });
    expect(players(gameId).map((p) => p.user_id)).toEqual([JAN]);
  });
});

describe("starting", () => {
  it("needs someone who accepted and withdraws open invites", async () => {
    const { gameId } = await act<{ gameId: string }>(JAN, {
      type: "create",
      gamemode: "Wunder",
      diceMode: "digital",
      invitees: [TIM, EVA],
    });
    expect(await code(act(JAN, { type: "start", gameId }))).toBe("too few");
    await act(TIM, { type: "respond", gameId, accept: true });
    expect(await code(act(TIM, { type: "start", gameId }))).toBe("not host");
    await act(JAN, { type: "start", gameId });
    expect(game(gameId).status).toBe("running");
    expect(game(gameId).state?.seats.map((s) => s.userId).sort()).toEqual([JAN, TIM].sort());
    expect(players(gameId).map((p) => p.user_id).sort()).toEqual([JAN, TIM].sort());
  });

  it("draws Chaoswunder missions from the lobby settings", async () => {
    const { gameId } = await act<{ gameId: string }>(JAN, {
      type: "create",
      gamemode: "Chaoswunder",
      diceMode: "digital",
      invitees: [TIM],
      missionEveryRound: true,
    });
    await act(TIM, { type: "respond", gameId, accept: true });
    await act(JAN, { type: "start", gameId });
    expect(game(gameId).state?.missions).toHaveLength(14);
    expect(game(gameId).state?.missionInterval).toBe(1);
  });
});

describe("playing", () => {
  it("rolls on the server and enters what the dice give", async () => {
    const gameId = await startedGame();
    const state = game(gameId).state!;
    const first = state.seats[state.current].userId;
    const other = first === JAN ? TIM : JAN;

    expect(await code(act(other, { type: "roll", gameId, keep: [false, false, false, false, false] }))).toBe(
      "not your turn",
    );
    await act(first, { type: "roll", gameId, keep: [false, false, false, false, false] });
    const rolled = game(gameId).state!;
    expect(rolled.turn.rolls).toBe(1);
    expect(rolled.turn.dice.every((d) => d >= 1 && d <= 6)).toBe(true);

    await act(first, { type: "score", gameId, field: "Chance" });
    const after = game(gameId).state!;
    const sum = rolled.turn.dice.reduce((a, b) => a + b, 0);
    expect(after.seats[rolled.current].points.Chance).toBe(sum);
    expect(after.seats[after.current].userId).toBe(other);
  });

  it("ignores a value sent with digital dice", async () => {
    const gameId = await startedGame();
    const state = game(gameId).state!;
    const first = state.seats[state.current].userId;
    expect(await code(act(first, { type: "score", gameId, field: "Wunder", value: 50 }))).toBe("field not allowed");
    await act(first, { type: "roll", gameId, keep: [false, false, false, false, false] });
    await act(first, { type: "score", gameId, field: "Chance", value: 999 });
    expect(game(gameId).state!.seats[state.current].points.Chance).not.toBe(999);
  });

  it("plays a game with real dice to the end and frees both players", async () => {
    const gameId = await startedGame("physical", "MiniWunder");
    const fields = ["Vierer", "Fünfer", "Sechser", "Zweierpasch", "Tiny House", "Mini Straße", "Mini Wunder", "Chance"];
    for (const field of fields) {
      for (let i = 0; i < 2; i++) {
        const state = game(gameId).state!;
        const uid = state.seats[state.current].userId;
        await act(uid, { type: "score", gameId, field, value: field === "Mini Wunder" ? 30 : "X" });
      }
    }
    expect(game(gameId).status).toBe("finished");
    expect(players(gameId).every((p) => !p.active)).toBe(true);
    // Free for the next game.
    expect(await code(act(TIM, { type: "create", gamemode: "Wunder", diceMode: "digital", invitees: [JAN] }))).toBe(
      "ok",
    );
  });

  it("lets the host correct a cell with real dice", async () => {
    const gameId = await startedGame("physical");
    const state = game(gameId).state!;
    const uid = state.seats[state.current].userId;
    await act(uid, { type: "score", gameId, field: "Dreier", value: 9 });
    expect(await code(act(TIM, { type: "correct", gameId, userId: uid, field: "Dreier", value: 12 }))).toBe(
      "not host",
    );
    await act(JAN, { type: "correct", gameId, userId: uid, field: "Dreier", value: 12 });
    expect(game(gameId).state!.seats[state.current].points.Dreier).toBe(12);
  });
});

describe("leaving", () => {
  it("passes the host role on and ends the game when the last player leaves", async () => {
    const gameId = await startedGame("physical");
    await act(JAN, { type: "leave", gameId });
    expect(game(gameId).host_id).toBe(TIM);
    expect(game(gameId).status).toBe("running");
    const state = game(gameId).state!;
    expect(state.seats[state.current].userId).toBe(TIM);
    expect(players(gameId).find((p) => p.user_id === JAN)).toMatchObject({ status: "left", active: false });
    await act(TIM, { type: "leave", gameId });
    expect(game(gameId).status).toBe("finished");
  });

  it("the host can take out a stalling player", async () => {
    const { gameId } = await act<{ gameId: string }>(JAN, {
      type: "create",
      gamemode: "Wunder",
      diceMode: "physical",
      invitees: [TIM, EVA],
    });
    await act(TIM, { type: "respond", gameId, accept: true });
    await act(EVA, { type: "respond", gameId, accept: true });
    await act(JAN, { type: "start", gameId });
    await act(JAN, { type: "remove", gameId, userId: EVA });
    const state = game(gameId).state!;
    expect(state.seats.find((s) => s.userId === EVA)?.left).toBe(true);
    expect(state.seats[state.current].userId).not.toBe(EVA);
  });

  it("cancelling frees everyone", async () => {
    const gameId = await startedGame();
    expect(await code(act(TIM, { type: "cancel", gameId }))).toBe("not host");
    await act(JAN, { type: "cancel", gameId });
    expect(game(gameId).status).toBe("cancelled");
    expect(players(gameId).every((p) => !p.active)).toBe(true);
  });

  it("a host leaving the lobby cancels it", async () => {
    const { gameId } = await act<{ gameId: string }>(JAN, { type: "create", gamemode: "Wunder", diceMode: "digital", invitees: [TIM] });
    await act(JAN, { type: "leave", gameId });
    expect(game(gameId).status).toBe("cancelled");
  });
});

it("rejects malformed ids", async () => {
  expect(await code(act(JAN, { type: "start", gameId: "1; drop table" }))).toBe("bad request");
});
