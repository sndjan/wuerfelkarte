import { describe, expect, it } from "vitest";

import {
  CABO_MISS_PENALTY,
  DEFAULT_TARGET_SCORE,
  MAX_TARGET_SCORE,
  MIN_TARGET_SCORE,
  SPECIAL_HAND_PENALTY,
  absentEntry,
  caboCallCount,
  clampTargetScore,
  computeRoundScores,
  createCaboGame,
  createRound,
  emptyEntry,
  firstOpenRound,
  hasAnyEntry,
  highestScore,
  isEntryComplete,
  isGameFinished,
  isRoundComplete,
  minAllowedRounds,
  minTargetScore,
  roundTotal,
  roundsPlayedBy,
  roundsWonBy,
  scoreAfterRound,
  standings,
  targetReached,
  totalScore,
} from "./scoring";
import type { CaboPlayer, CaboRound, CaboRoundEntry } from "./types";

/** Characterization tests, following the same shape as Flip 7's. */

const players: CaboPlayer[] = [
  { id: "a", name: "Anna" },
  { id: "b", name: "Ben" },
  { id: "c", name: "Cleo" },
];

const entry = (over: Partial<CaboRoundEntry> = {}): CaboRoundEntry => ({
  ...emptyEntry(),
  ...over,
});

const round = (entries: Record<string, CaboRoundEntry>): CaboRound => ({
  entries,
});

const gameWith = (rounds: CaboRound[], targetScore = DEFAULT_TARGET_SCORE) => {
  const game = createCaboGame(players, targetScore, "Standard");
  game.rounds = rounds;
  return game;
};

describe("isEntryComplete", () => {
  it("accepts a sum or an absence", () => {
    expect(isEntryComplete(entry({ cardSum: 12 }))).toBe(true);
    expect(isEntryComplete(entry({ cardSum: 0 }))).toBe(true);
    expect(isEntryComplete(absentEntry())).toBe(true);
  });

  it("rejects an untouched entry", () => {
    expect(isEntryComplete(emptyEntry())).toBe(false);
    expect(isEntryComplete(undefined)).toBe(false);
  });
});

describe("rounds", () => {
  it("creates one empty entry per player", () => {
    const r = createRound(players);
    expect(Object.keys(r.entries)).toEqual(["a", "b", "c"]);
    expect(hasAnyEntry(r)).toBe(false);
  });

  it("is complete only when every player is resolved", () => {
    const partial = round({
      a: entry({ cardSum: 10 }),
      b: entry({ cardSum: 5 }),
      c: emptyEntry(),
    });
    expect(isRoundComplete(partial, players)).toBe(false);

    const done = round({
      a: entry({ cardSum: 10 }),
      b: entry({ cardSum: 5 }),
      c: absentEntry(),
    });
    expect(isRoundComplete(done, players)).toBe(true);
  });

  it("is never complete without players", () => {
    expect(isRoundComplete(createRound([]), [])).toBe(false);
  });

  it("ignores absent players when looking for entries", () => {
    expect(hasAnyEntry(round({ a: absentEntry() }))).toBe(false);
    expect(hasAnyEntry(round({ a: entry({ calledCabo: true }) }))).toBe(true);
  });
});

describe("computeRoundScores", () => {
  it("is null for everyone while the round is still open", () => {
    const r = round({ a: entry({ cardSum: 10 }), b: emptyEntry(), c: emptyEntry() });
    const scores = computeRoundScores(r, players);
    expect(scores.a).toBeNull();
    expect(scores.b).toBeNull();
    expect(scores.c).toBeNull();
  });

  it("gives the lowest hand 0 and everyone else their own sum", () => {
    const r = round({
      a: entry({ cardSum: 3 }),
      b: entry({ cardSum: 20 }),
      c: entry({ cardSum: 8 }),
    });
    expect(computeRoundScores(r, players)).toEqual({ a: 0, b: 20, c: 8 });
  });

  it("charges the Cabo-Sager +5 when someone else had the lowest hand", () => {
    const r = round({
      a: entry({ cardSum: 3, calledCabo: true }),
      b: entry({ cardSum: 1 }),
      c: entry({ cardSum: 8 }),
    });
    expect(computeRoundScores(r, players)).toEqual({
      a: 3 + CABO_MISS_PENALTY,
      b: 0,
      c: 8,
    });
  });

  it("does not penalise the Cabo-Sager when they do have the lowest hand", () => {
    const r = round({
      a: entry({ cardSum: 1, calledCabo: true }),
      b: entry({ cardSum: 10 }),
      c: entry({ cardSum: 8 }),
    });
    expect(computeRoundScores(r, players)).toEqual({ a: 0, b: 10, c: 8 });
  });

  it("lets the Cabo-Sager win a tie alone, everyone else keeps their sum", () => {
    const r = round({
      a: entry({ cardSum: 5, calledCabo: true }),
      b: entry({ cardSum: 5 }),
      c: entry({ cardSum: 20 }),
    });
    expect(computeRoundScores(r, players)).toEqual({ a: 0, b: 5, c: 20 });
  });

  it("gives every tied player 0 when there is no Cabo-Sager among them", () => {
    const r = round({
      a: entry({ cardSum: 5 }),
      b: entry({ cardSum: 5 }),
      c: entry({ cardSum: 20, calledCabo: true }),
    });
    expect(computeRoundScores(r, players)).toEqual({
      a: 0,
      b: 0,
      c: 20 + CABO_MISS_PENALTY,
    });
  });

  it("gives every tied player 0 when nobody called Cabo at all", () => {
    const r = round({
      a: entry({ cardSum: 5 }),
      b: entry({ cardSum: 5 }),
      c: entry({ cardSum: 20 }),
    });
    expect(computeRoundScores(r, players)).toEqual({ a: 0, b: 0, c: 20 });
  });

  it("overrides everything for the 12-12-13-13 special hand", () => {
    const r = round({
      a: entry({ cardSum: 50, specialHand: true }),
      b: entry({ cardSum: 2, calledCabo: true }),
      c: entry({ cardSum: 1 }),
    });
    expect(computeRoundScores(r, players)).toEqual({
      a: 0,
      b: SPECIAL_HAND_PENALTY,
      c: SPECIAL_HAND_PENALTY,
    });
  });

  it("skips absent players and leaves their score null", () => {
    const r = round({
      a: entry({ cardSum: 3 }),
      b: entry({ cardSum: 10 }),
      c: absentEntry(),
    });
    expect(computeRoundScores(r, players)).toEqual({ a: 0, b: 10, c: null });
  });
});

describe("totals", () => {
  it("sums the scored rounds", () => {
    const game = gameWith([
      round({ a: entry({ cardSum: 0 }), b: entry({ cardSum: 20 }), c: entry({ cardSum: 5 }) }),
      round({ a: entry({ cardSum: 30 }), b: entry({ cardSum: 0 }), c: absentEntry() }),
    ]);
    expect(totalScore(game, "a")).toBe(0 + 30);
    expect(totalScore(game, "b")).toBe(20 + 0);
    expect(totalScore(game, "c")).toBe(5);
  });

  it("reduces a total by half the target the moment it lands exactly on it", () => {
    const game = gameWith(
      [
        round({ a: entry({ cardSum: 60 }), b: entry({ cardSum: 0 }), c: absentEntry() }),
        round({ a: entry({ cardSum: 40 }), b: entry({ cardSum: 0 }), c: absentEntry() }),
        round({ a: entry({ cardSum: 5 }), b: entry({ cardSum: 0 }), c: absentEntry() }),
      ],
      100,
    );
    // 60, then 60+40 = 100 -> reduced to 50, then 50+5 = 55.
    expect(scoreAfterRound(game, "a", 0)).toBe(60);
    expect(scoreAfterRound(game, "a", 1)).toBe(50);
    expect(scoreAfterRound(game, "a", 2)).toBe(55);
    expect(totalScore(game, "a")).toBe(55);
  });

  it("counts rounds played, skipping absences", () => {
    const game = gameWith([
      round({ a: entry({ cardSum: 1 }), b: entry({ cardSum: 1 }), c: absentEntry() }),
      round({ a: entry({ cardSum: 1 }), b: entry({ cardSum: 1 }), c: entry({ cardSum: 1 }) }),
    ]);
    expect(roundsPlayedBy(game, "a")).toBe(2);
    expect(roundsPlayedBy(game, "c")).toBe(1);
  });

  it("counts rounds won and Cabo calls", () => {
    const game = gameWith([
      round({
        a: entry({ cardSum: 0, calledCabo: true }),
        b: entry({ cardSum: 10 }),
        c: entry({ cardSum: 20 }),
      }),
      round({
        a: entry({ cardSum: 5 }),
        b: entry({ cardSum: 0, calledCabo: true }),
        c: entry({ cardSum: 20 }),
      }),
    ]);
    expect(roundsWonBy(game, "a")).toBe(1);
    expect(caboCallCount(game, "a")).toBe(1);
    expect(caboCallCount(game, "b")).toBe(1);
    expect(caboCallCount(game, "c")).toBe(0);
  });

  it("sorts standings lowest first", () => {
    const game = gameWith([
      round({ a: entry({ cardSum: 30 }), b: entry({ cardSum: 0 }), c: entry({ cardSum: 15 }) }),
    ]);
    expect(standings(game).map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("reports the worst total on the table", () => {
    const game = gameWith([
      round({ a: entry({ cardSum: 30 }), b: entry({ cardSum: 0 }), c: entry({ cardSum: 15 }) }),
    ]);
    expect(highestScore(game)).toBe(30);
  });
});

describe("the target score", () => {
  it("snaps to the 10-point grid and clamps to the allowed range", () => {
    expect(clampTargetScore(100)).toBe(100);
    expect(clampTargetScore(103)).toBe(100);
    expect(clampTargetScore(0)).toBe(MIN_TARGET_SCORE);
    expect(clampTargetScore(9999)).toBe(MAX_TARGET_SCORE);
  });

  it("is reached only once someone is strictly past it", () => {
    const at = gameWith(
      [round({ a: entry({ cardSum: 100 }), b: entry({ cardSum: 0 }), c: absentEntry() })],
      100,
    );
    // Lands exactly on 100 -> reduced to 50, never reaches the target.
    expect(targetReached(at)).toBe(false);

    const past = gameWith(
      [round({ a: entry({ cardSum: 101 }), b: entry({ cardSum: 0 }), c: absentEntry() })],
      100,
    );
    expect(targetReached(past)).toBe(true);
  });

  it("is never reached with no players", () => {
    const empty = createCaboGame([], 100, "Standard");
    expect(targetReached(empty)).toBe(false);
  });

  it("refuses to drop the goal below the current worst total", () => {
    const game = gameWith([
      round({ a: entry({ cardSum: 65 }), b: entry({ cardSum: 0 }), c: absentEntry() }),
    ]);
    // 65 snapped up to the next 10 -> 70
    expect(minTargetScore(game)).toBe(70);
  });

  it("never proposes a goal under the minimum", () => {
    expect(minTargetScore(gameWith([createRound(players)]))).toBe(MIN_TARGET_SCORE);
  });
});

describe("game state", () => {
  it("starts with exactly one open round and no timestamps", () => {
    const game = createCaboGame(players, 100, "Standard");
    expect(game.rounds).toHaveLength(1);
    expect(game.targetScore).toBe(100);
    expect(game.startedAt).toBeNull();
    expect(game.finishedAt).toBeNull();
    expect(game.id).toBeTruthy();
  });

  it("counts as finished only once the group confirms the end", () => {
    const game = gameWith([round({ a: entry({ cardSum: 500 }) })], 100);
    expect(isGameFinished(game)).toBe(false);
    game.finishedAt = Date.now();
    expect(isGameFinished(game)).toBe(true);
  });

  it("points at the first incomplete round, or the last when all are filled", () => {
    const game = gameWith([
      round({ a: entry({ cardSum: 1 }), b: entry({ cardSum: 1 }), c: entry({ cardSum: 1 }) }),
      createRound(players),
    ]);
    expect(firstOpenRound(game)).toBe(1);
  });

  it("refuses to shrink below the last round that holds entries", () => {
    const game = gameWith([
      round({ a: entry({ cardSum: 5 }) }),
      createRound(players),
      createRound(players),
    ]);
    expect(minAllowedRounds(game)).toBe(1);
  });

  it("sums what the whole table scored in a round", () => {
    const r = round({
      a: entry({ cardSum: 20 }),
      b: entry({ cardSum: 0 }),
      c: entry({ cardSum: 30 }),
    });
    expect(roundTotal(r, players)).toBe(20 + 0 + 30);
  });
});
