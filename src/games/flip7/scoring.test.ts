import { describe, expect, it } from "vitest";

import {
  DEFAULT_TARGET_SCORE,
  FLIP7_BONUS,
  MAX_TARGET_SCORE,
  MIN_TARGET_SCORE,
  absentEntry,
  bestRoundScore,
  bustCount,
  clampTargetScore,
  createFlip7Game,
  createRound,
  emptyEntry,
  entryScore,
  firstOpenRound,
  flip7Count,
  hasAnyEntry,
  isEntryComplete,
  isGameFinished,
  isRoundComplete,
  isTiedAtTop,
  leaderScore,
  minAllowedRounds,
  minTargetScore,
  roundTotal,
  roundsPlayedBy,
  scoreAfterRound,
  standings,
  targetReached,
  totalScore,
} from "./scoring";
import type { Flip7Player, Flip7Round, Flip7RoundEntry } from "./types";

/** Characterization tests — pin current behaviour before the code moves. */

const players: Flip7Player[] = [
  { id: "a", name: "Anna" },
  { id: "b", name: "Ben" },
  { id: "c", name: "Cleo" },
];

const entry = (over: Partial<Flip7RoundEntry> = {}): Flip7RoundEntry => ({
  ...emptyEntry(),
  ...over,
});

const round = (entries: Record<string, Flip7RoundEntry>): Flip7Round => ({
  entries,
});

const gameWith = (rounds: Flip7Round[], targetScore = DEFAULT_TARGET_SCORE) => {
  const game = createFlip7Game(players, targetScore, "Standard");
  game.rounds = rounds;
  return game;
};

describe("entryScore", () => {
  it("adds the Flip 7 bonus on top of the entered points", () => {
    expect(entryScore(entry({ points: 63, flip7: true }))).toBe(63 + FLIP7_BONUS);
  });

  it("scores a bust as a hard 0 regardless of points", () => {
    expect(entryScore(entry({ points: 42, busted: true }))).toBe(0);
  });

  it("returns null for an absent player, never 0", () => {
    expect(entryScore(absentEntry())).toBeNull();
  });

  it("returns null while the entry is still open", () => {
    expect(entryScore(emptyEntry())).toBeNull();
    expect(entryScore(undefined)).toBeNull();
  });

  it("distinguishes a scored 0 from an open entry", () => {
    expect(entryScore(entry({ points: 0 }))).toBe(0);
  });
});

describe("isEntryComplete", () => {
  it("accepts a number, a bust or an absence", () => {
    expect(isEntryComplete(entry({ points: 12 }))).toBe(true);
    expect(isEntryComplete(entry({ busted: true }))).toBe(true);
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
      a: entry({ points: 10 }),
      b: entry({ busted: true }),
      c: emptyEntry(),
    });
    expect(isRoundComplete(partial, players)).toBe(false);

    const done = round({
      a: entry({ points: 10 }),
      b: entry({ busted: true }),
      c: absentEntry(),
    });
    expect(isRoundComplete(done, players)).toBe(true);
  });

  it("is never complete without players", () => {
    expect(isRoundComplete(createRound([]), [])).toBe(false);
  });

  it("ignores absent players when looking for entries", () => {
    expect(hasAnyEntry(round({ a: absentEntry() }))).toBe(false);
    expect(hasAnyEntry(round({ a: entry({ busted: true }) }))).toBe(true);
  });

  it("sums what the whole table scored in a round", () => {
    const r = round({
      a: entry({ points: 20 }),
      b: entry({ busted: true }),
      c: entry({ points: 30, flip7: true }),
    });
    expect(roundTotal(r, players)).toBe(20 + 0 + 45);
  });
});

describe("totals", () => {
  const game = gameWith([
    round({
      a: entry({ points: 30 }),
      b: entry({ busted: true }),
      c: entry({ points: 20 }),
    }),
    round({
      a: entry({ points: 25, flip7: true }),
      b: entry({ points: 40 }),
      c: absentEntry(),
    }),
  ]);

  it("sums the scored rounds", () => {
    expect(totalScore(game, "a")).toBe(30 + 40);
    expect(totalScore(game, "b")).toBe(0 + 40);
    expect(totalScore(game, "c")).toBe(20);
  });

  it("gives running totals per round", () => {
    expect(scoreAfterRound(game, "a", 0)).toBe(30);
    expect(scoreAfterRound(game, "a", 1)).toBe(70);
  });

  it("counts rounds played, skipping absences", () => {
    expect(roundsPlayedBy(game, "a")).toBe(2);
    expect(roundsPlayedBy(game, "c")).toBe(1);
  });

  it("counts busts and Flip 7s", () => {
    expect(bustCount(game, "b")).toBe(1);
    expect(flip7Count(game, "a")).toBe(1);
    expect(flip7Count(game, "b")).toBe(0);
  });

  it("reports the best single round including the bonus", () => {
    expect(bestRoundScore(game, "a")).toBe(40);
    expect(bestRoundScore(game, "c")).toBe(20);
  });

  it("sorts standings highest first", () => {
    expect(standings(game).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("reports the leader's score", () => {
    expect(leaderScore(game)).toBe(70);
  });
});

describe("the target score", () => {
  it("snaps to the 25-point grid and clamps to the allowed range", () => {
    expect(clampTargetScore(200)).toBe(200);
    expect(clampTargetScore(213)).toBe(225);
    expect(clampTargetScore(0)).toBe(MIN_TARGET_SCORE);
    expect(clampTargetScore(9999)).toBe(MAX_TARGET_SCORE);
  });

  it("is reached once anyone is at or above it", () => {
    const game = gameWith([round({ a: entry({ points: 200 }) })], 200);
    expect(targetReached(game)).toBe(true);

    const below = gameWith([round({ a: entry({ points: 199 }) })], 200);
    expect(targetReached(below)).toBe(false);
  });

  it("is never reached with no players", () => {
    const empty = createFlip7Game([], 200, "Standard");
    expect(targetReached(empty)).toBe(false);
  });

  it("refuses to drop the goal below the current leader", () => {
    const game = gameWith([round({ a: entry({ points: 130 }) })]);
    // 130 snapped up to the next 25 → 150
    expect(minTargetScore(game)).toBe(150);
  });

  it("never proposes a goal under the minimum", () => {
    expect(minTargetScore(gameWith([createRound(players)]))).toBe(MIN_TARGET_SCORE);
  });

  it("flags a shared lead, which the rulebook resolves with another round", () => {
    const tied = gameWith([
      round({ a: entry({ points: 100 }), b: entry({ points: 100 }) }),
    ]);
    expect(isTiedAtTop(tied)).toBe(true);

    const clear = gameWith([
      round({ a: entry({ points: 100 }), b: entry({ points: 90 }) }),
    ]);
    expect(isTiedAtTop(clear)).toBe(false);
  });
});

describe("game state", () => {
  it("starts with exactly one open round and no timestamps", () => {
    const game = createFlip7Game(players, 200, "Standard");
    expect(game.rounds).toHaveLength(1);
    expect(game.targetScore).toBe(200);
    expect(game.startedAt).toBeNull();
    expect(game.finishedAt).toBeNull();
    expect(game.id).toBeTruthy();
  });

  it("counts as finished only once the group confirms the end", () => {
    const game = gameWith([round({ a: entry({ points: 500 }) })], 200);
    expect(isGameFinished(game)).toBe(false);
    game.finishedAt = Date.now();
    expect(isGameFinished(game)).toBe(true);
  });

  it("points at the first incomplete round, or the last when all are filled", () => {
    const game = gameWith([
      round({ a: entry({ points: 1 }), b: entry({ points: 1 }), c: entry({ points: 1 }) }),
      createRound(players),
    ]);
    expect(firstOpenRound(game)).toBe(1);

    game.rounds[1] = round({
      a: entry({ points: 1 }),
      b: entry({ points: 1 }),
      c: entry({ points: 1 }),
    });
    expect(firstOpenRound(game)).toBe(1);
  });

  it("refuses to shrink below the last round that holds entries", () => {
    const game = gameWith([
      round({ a: entry({ points: 5 }) }),
      createRound(players),
      createRound(players),
    ]);
    expect(minAllowedRounds(game)).toBe(1);
  });
});
