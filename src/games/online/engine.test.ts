import { describe, expect, it } from "vitest";

import { missions } from "@/games/yatzy/gamemodes/chaoswunder";
import { scoreField } from "./dice";
import {
  applyCorrection,
  applyEntry,
  applyLeave,
  applyRoll,
  candidateFields,
  canKeep,
  digitalEntry,
  fieldKeys,
  newState,
  nextRoll,
  physicalEntry,
  seatScore,
  toMatch,
  type OnlineState,
} from "./engine";
import { missionRules } from "./missions";

/** A random source that yields the given faces in order. */
const faces = (...values: number[]) => {
  let i = 0;
  return () => (values[i++ % values.length] - 1) / 6 + 0.01;
};

const seats = [
  { userId: "a", name: "Anna" },
  { userId: "b", name: "Ben" },
];

const withDice = (state: OnlineState, dice: number[]): OnlineState => ({
  ...state,
  turn: { ...state.turn, rolls: 1, dice, thrown: dice.map(() => true) },
});

describe("scoreField", () => {
  it("scores the classic fields", () => {
    expect(scoreField("Dreier", [3, 3, 1, 3, 6])).toBe(9);
    expect(scoreField("Dreierpasch", [3, 3, 1, 3, 6])).toBe(16);
    expect(scoreField("Viererpasch", [3, 3, 1, 3, 6])).toBe(0);
    expect(scoreField("Full House", [2, 2, 5, 5, 5])).toBe(25);
    expect(scoreField("Full House", [5, 5, 5, 5, 5])).toBe(0);
    expect(scoreField("Kleine Straße", [1, 2, 3, 4, 4])).toBe(30);
    expect(scoreField("Große Straße", [1, 2, 3, 4, 4])).toBe(0);
    expect(scoreField("Große Straße", [6, 2, 3, 4, 5])).toBe(40);
    expect(scoreField("Wunder", [4, 4, 4, 4, 4])).toBe(50);
    expect(scoreField("Chance", [1, 2, 3, 4, 6])).toBe(16);
  });

  it("scores Mini and Super fields", () => {
    expect(scoreField("Tiny House", [2, 2, 5])).toBe(15);
    expect(scoreField("Tiny House", [2, 2, 2])).toBe(0);
    expect(scoreField("Zweierpasch", [2, 2, 5])).toBe(9);
    expect(scoreField("Mini Straße", [4, 6, 5])).toBe(20);
    expect(scoreField("Mini Wunder", [3, 3, 3])).toBe(30);
    expect(scoreField("Dreifach-Paar", [1, 1, 4, 4, 6, 6])).toBe(30);
    expect(scoreField("Dreifach-Paar", [1, 1, 1, 1, 6, 6])).toBe(30);
    expect(scoreField("Full Villa", [2, 2, 2, 5, 5, 5])).toBe(45);
    expect(scoreField("Riesige Straße", [6, 5, 4, 3, 2, 1])).toBe(55);
    expect(scoreField("Super Wunder", [6, 6, 6, 6, 6, 6])).toBe(100);
    expect(scoreField("Fünferpasch", [2, 2, 2, 2, 2, 6])).toBe(16);
  });

  it("reads sixes as any face with the joker", () => {
    expect(scoreField("Wunder", [3, 3, 3, 6, 6], true)).toBe(50);
    expect(scoreField("Große Straße", [1, 2, 6, 4, 5], true)).toBe(40);
    expect(scoreField("Einser", [1, 6, 6, 2, 3], true)).toBe(3);
    expect(scoreField("Wunder", [3, 3, 3, 6, 6], false)).toBe(0);
  });
});

describe("missionRules", () => {
  it("understands every mission", () => {
    const rules = missions.map(missionRules);
    expect(rules[0]).toEqual({ maxRolls: 3, noRerollFace: 1 });
    expect(rules[8]).toEqual({ maxRolls: 5, lockAtLeastOne: true });
    expect(rules[9]).toEqual({ maxRolls: 2, allAtOnce: true });
    expect(rules[13]).toEqual({ maxRolls: 4, keepParity: "even" });
    expect(rules[14]).toEqual({ maxRolls: 3, keepParity: "odd" });
    expect(rules[19]).toEqual({ maxRolls: 3, extraRollOnSix: true });
    expect(rules[20]).toEqual({ maxRolls: 2, presetTwo: true });
    expect(rules[21]).toEqual({ maxRolls: 3, optionalAllDiceRoll: true });
    expect(rules[22]).toEqual({ maxRolls: 3, sixIsJoker: true });
    // Every mission says something the engine can act on (or is plain).
    for (const [i, r] of rules.entries()) {
      const plain = missions[i].restriction.startsWith("Keine zusätzlichen");
      expect(Object.keys(r).length > 1 || plain).toBe(true);
    }
  });
});

describe("rolling", () => {
  it("allows three rolls and keeps held dice", () => {
    let state = newState({ gamemode: "Wunder", diceMode: "digital", seats });
    state = applyRoll(state, 0, { keep: [false, false, false, false, false] }, faces(1, 2, 3, 4, 5));
    expect(state.turn.dice).toEqual([1, 2, 3, 4, 5]);
    state = applyRoll(state, 0, { keep: [true, true, false, false, false] }, faces(6));
    expect(state.turn.dice).toEqual([1, 2, 6, 6, 6]);
    state = applyRoll(state, 0, { keep: [true, true, true, true, false] }, faces(2));
    expect(state.turn.rolls).toBe(3);
    expect(nextRoll(state)).toBeNull();
    expect(() => applyRoll(state, 0, { keep: [true, true, true, true, false] })).toThrow();
  });

  it("refuses a roll out of turn", () => {
    const state = newState({ gamemode: "Wunder", diceMode: "digital", seats });
    expect(() => applyRoll(state, 1, { keep: [false, false, false, false, false] })).toThrow("not your turn");
  });

  it("rolls three dice in Mini and six in Super", () => {
    expect(newState({ gamemode: "MiniWunder", diceMode: "digital", seats }).turn.dice).toHaveLength(3);
    expect(newState({ gamemode: "SuperWunder", diceMode: "digital", seats }).turn.dice).toHaveLength(6);
  });

  const chaos = (missionIndex: number) =>
    newState({ gamemode: "Chaoswunder", diceMode: "digital", seats, missions: [missions[missionIndex]] });

  it("keeps a forbidden face in place", () => {
    let state = chaos(5); // sixes may not be rerolled
    state = applyRoll(state, 0, { keep: [false, false, false, false, false] }, faces(6, 2, 3, 4, 5));
    expect(canKeep(state, 0)).toBe(false);
    state = applyRoll(state, 0, { keep: [false, false, false, false, false] }, faces(1));
    expect(state.turn.dice[0]).toBe(6);
  });

  it("forbids keeping when all dice are thrown at once", () => {
    let state = chaos(9);
    state = applyRoll(state, 0, { keep: [false, false, false, false, false] }, faces(1, 2, 3, 4, 5));
    expect(canKeep(state, 0)).toBe(false);
    expect(() => applyRoll(state, 0, { keep: [true, false, false, false, false] })).toThrow();
    state = applyRoll(state, 0, { keep: [false, false, false, false, false] }, faces(2));
    expect(nextRoll(state)).toBeNull();
  });

  it("locks kept dice and demands one more each roll", () => {
    let state = chaos(6);
    state = applyRoll(state, 0, { keep: [false, false, false, false, false] }, faces(1, 2, 3, 4, 5));
    expect(() => applyRoll(state, 0, { keep: [false, false, false, false, false] })).toThrow("keep one");
    state = applyRoll(state, 0, { keep: [true, false, false, false, false] }, faces(6));
    expect(canKeep(state, 0)).toBe(false);
    expect(() => applyRoll(state, 0, { keep: [false, false, false, false, false] })).toThrow("keep one");
  });

  it("only keeps even dice", () => {
    let state = chaos(12);
    state = applyRoll(state, 0, { keep: [false, false, false, false, false] }, faces(1, 2, 3, 4, 5));
    expect(canKeep(state, 0)).toBe(false);
    expect(canKeep(state, 1)).toBe(true);
    expect(() => applyRoll(state, 0, { keep: [true, false, false, false, false] })).toThrow();
  });

  it("gives an extra roll after a six", () => {
    let state = chaos(19);
    const all = [false, false, false, false, false];
    state = applyRoll(state, 0, { keep: all }, faces(1));
    state = applyRoll(state, 0, { keep: all }, faces(1));
    state = applyRoll(state, 0, { keep: all }, faces(1, 1, 1, 1, 6));
    expect(nextRoll(state)).toBe("extra-six");
    state = applyRoll(state, 0, { keep: all }, faces(6));
    expect(nextRoll(state)).toBeNull();
  });

  it("lets two dice be set before the first roll", () => {
    let state = chaos(20);
    state = applyRoll(state, 0, { keep: [false, false, false, false, false], preset: [6, 6] }, faces(1));
    expect(state.turn.dice).toEqual([6, 6, 1, 1, 1]);
    const plain = newState({ gamemode: "Wunder", diceMode: "digital", seats });
    expect(() => applyRoll(plain, 0, { keep: [false, false, false, false, false], preset: [6] })).toThrow();
  });

  it("offers an optional fourth roll of all dice", () => {
    let state = chaos(21);
    const all = [false, false, false, false, false];
    for (let i = 0; i < 3; i++) state = applyRoll(state, 0, { keep: all }, faces(2));
    expect(nextRoll(state)).toBe("all-dice");
    expect(() => applyRoll(state, 0, { keep: [true, false, false, false, false] })).not.toThrow();
    const after = applyRoll(state, 0, { keep: [true, false, false, false, false] }, faces(3));
    expect(after.turn.dice).toEqual([3, 3, 3, 3, 3]);
  });
});

describe("entering", () => {
  it("enters the dice and passes the turn", () => {
    let state = withDice(newState({ gamemode: "Wunder", diceMode: "digital", seats }), [2, 2, 5, 5, 5]);
    const entry = digitalEntry(state, "Full House");
    expect(entry).toEqual({ value: 25, doubled: false, extraWunder: false });
    state = applyEntry(state, 0, "Full House", entry, 5);
    expect(state.seats[0].points["Full House"]).toBe(25);
    expect(state.current).toBe(1);
    expect(state.turn.rolls).toBe(0);
  });

  it("crosses out a field the dice do not fit", () => {
    const state = withDice(newState({ gamemode: "Wunder", diceMode: "digital", seats }), [1, 2, 3, 3, 5]);
    expect(digitalEntry(state, "Wunder")?.value).toBe("X");
  });

  it("refuses a filled field and entering before rolling", () => {
    const fresh = newState({ gamemode: "Wunder", diceMode: "digital", seats });
    expect(digitalEntry(fresh, "Chance")).toBeNull();
    const state = withDice(fresh, [1, 2, 3, 3, 5]);
    const after = applyEntry(state, 0, "Chance", digitalEntry(state, "Chance"));
    const back = withDice({ ...after, current: 0 }, [1, 1, 1, 1, 1]);
    expect(digitalEntry(back, "Chance")).toBeNull();
  });

  it("adds an extra Wunder in Wunder+ and limits it to fitting fields", () => {
    let state = newState({ gamemode: "WunderPlus", diceMode: "digital", seats });
    state.seats[0].points.Wunder = 50;
    state = withDice(state, [4, 4, 4, 4, 4]);
    expect(digitalEntry(state, "Full House")).toBeNull();
    const entry = digitalEntry(state, "Vierer");
    expect(entry).toEqual({ value: 20, doubled: false, extraWunder: true });
    state = applyEntry(state, 0, "Vierer", entry);
    expect(state.seats[0].points.Wunder).toBe(100);
  });

  it("crosses a field for an extra Wunder with no fitting field left", () => {
    let state = newState({ gamemode: "WunderPlus", diceMode: "digital", seats });
    for (const key of ["Wunder", "Vierer", "Dreierpasch", "Viererpasch", "Chance"]) state.seats[0].points[key] = 50;
    state = withDice(state, [4, 4, 4, 4, 4]);
    expect(digitalEntry(state, "Full House")).toEqual({ value: "X", doubled: false, extraWunder: true });
  });

  it("validates hand-entered values", () => {
    const state = newState({ gamemode: "Wunder", diceMode: "physical", seats });
    expect(physicalEntry(state, "Full House", 25)).not.toBeNull();
    expect(physicalEntry(state, "Full House", 20)).toBeNull();
    expect(physicalEntry(state, "Full House", "X")).not.toBeNull();
    expect(physicalEntry(state, "Wunder", 50, true)).toBeNull();
  });

  it("lets the host correct a filled cell", () => {
    let state = newState({ gamemode: "Wunder", diceMode: "physical", seats });
    state = applyEntry(state, 0, "Dreier", physicalEntry(state, "Dreier", 9));
    state = applyCorrection(state, 0, "Dreier", 12);
    expect(state.seats[0].points.Dreier).toBe(12);
    expect(() => applyCorrection(state, 0, "Vierer", 12)).toThrow();
  });
});

describe("Battle", () => {
  it("blocks claimed fields, forces crossed ones and doubles a forced success", () => {
    let state = newState({ gamemode: "Battle", diceMode: "physical", seats: [...seats, { userId: "c", name: "Cleo" }] });
    state = applyEntry(state, 0, "Full House", physicalEntry(state, "Full House", 25));
    expect(candidateFields(state, 1)).not.toContain("Full House");
    state = applyEntry(state, 1, "Große Straße", physicalEntry(state, "Große Straße", "X"));
    // Cleo must try the crossed field first.
    expect(candidateFields(state, 2)).toEqual(["Große Straße"]);
    expect(physicalEntry(state, "Chance", 20)).toBeNull();
    const entry = physicalEntry(state, "Große Straße", 40);
    expect(entry?.doubled).toBe(true);
    state = applyEntry(state, 2, "Große Straße", entry);
    expect(seatScore(state, state.seats[2])).toBe(80);
    // Anna no longer has a forced field: someone claimed it.
    expect(candidateFields(state, 0)).not.toContain("Große Straße");
  });
});

describe("the game", () => {
  it("finishes when every field is filled and records the match", () => {
    let state = newState({ gamemode: "MiniWunder", diceMode: "physical", seats, now: 0 });
    const keys = fieldKeys(state);
    for (const key of keys) {
      for (const seat of [0, 1]) {
        state = applyEntry(state, seat, key, physicalEntry(state, key, "X"), 1000);
      }
    }
    expect(state.finishedAt).toBe(1000);
    const match = toMatch(state, "g1");
    expect(match.online).toBe(true);
    expect(match.durationMs).toBe(1000);
    expect(match.players.map((p) => p.score)).toEqual([0, 0]);
  });

  it("skips players who left and finishes when everyone left", () => {
    let state = newState({ gamemode: "Wunder", diceMode: "physical", seats: [...seats, { userId: "c", name: "Cleo" }] });
    state = applyLeave(state, 0);
    expect(state.current).toBe(1);
    state = applyEntry(state, 1, "Chance", physicalEntry(state, "Chance", 20));
    expect(state.current).toBe(2);
    state = applyEntry(state, 2, "Chance", physicalEntry(state, "Chance", 20));
    expect(state.current).toBe(1);
    state = applyLeave(applyLeave(state, 1), 2);
    expect(state.finishedAt).not.toBeNull();
  });

  it("keeps two players with one name apart in the history", () => {
    const state = newState({
      gamemode: "Wunder",
      diceMode: "physical",
      seats: [
        { userId: "a", name: "Tim" },
        { userId: "b", name: "tim" },
      ],
    });
    expect(toMatch(state, "x").players.map((p) => p.name)).toEqual(["Tim", "tim (2)"]);
  });
});

describe("the scoreboard", () => {
  it("stays hidden until the host starts it", async () => {
    const { applyReveal, scoresRevealed } = await import("./engine");
    const state = newState({ gamemode: "Wunder", diceMode: "physical", seats, now: 0 });
    expect(scoresRevealed(state)).toBe(false);
    const revealed = applyReveal(state, 5);
    expect(scoresRevealed(revealed)).toBe(true);
    expect(applyReveal(revealed, 9).revealedAt).toBe(5);
  });
});
