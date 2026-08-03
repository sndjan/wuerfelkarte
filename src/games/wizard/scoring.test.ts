import { describe, expect, it } from "vitest";

import {
  allBidsEntered,
  allTricksEntered,
  biddingOrder,
  createRound,
  createWizardGame,
  cardsInRound,
  dealerIndex,
  deckSize,
  effectiveBid,
  exactBidCount,
  firstOpenRound,
  hasAnyEntry,
  isGameFinished,
  minAllowedRounds,
  playerRoundScore,
  roundScore,
  roundsPlayedBy,
  scoreAfterRound,
  standings,
  suggestedRounds,
  totalScore,
  tricksInRound,
  wolkeDeltaOptions,
} from "./scoring";
import { ALL_SPECIAL_CARDS } from "./specialCards";
import type { WizardPlayer, WizardRound } from "./types";

/** Characterization tests — pin current behaviour before the code moves. */

const players: WizardPlayer[] = [
  { id: "a", name: "Anna" },
  { id: "b", name: "Ben" },
  { id: "c", name: "Cleo" },
];

const round = (
  bids: Record<string, number | null>,
  tricks: Record<string, number | null>,
  extra: Partial<WizardRound> = {},
): WizardRound => ({ bids, tricks, bombTrick: false, wolke: null, ...extra });

describe("deck and round counts", () => {
  it("counts 60 character cards plus one per Sonderkarte", () => {
    expect(deckSize()).toBe(60);
    expect(deckSize([])).toBe(60);
    expect(deckSize(ALL_SPECIAL_CARDS)).toBe(67);
  });

  it("suggests the rulebook round counts for 3-6 players", () => {
    expect(suggestedRounds(3)).toBe(20);
    expect(suggestedRounds(4)).toBe(15);
    expect(suggestedRounds(5)).toBe(12);
    expect(suggestedRounds(6)).toBe(10);
  });

  it("raises the suggestion when Sonderkarten enlarge the deck", () => {
    expect(suggestedRounds(6, deckSize(ALL_SPECIAL_CARDS))).toBe(11);
  });

  it("never suggests fewer than one round, even with no players", () => {
    expect(suggestedRounds(0)).toBe(1);
    expect(suggestedRounds(100)).toBe(1);
  });

  it("deals one more card each round", () => {
    expect(cardsInRound(0)).toBe(1);
    expect(cardsInRound(9)).toBe(10);
  });
});

describe("roundScore", () => {
  it("pays 20 plus 10 per trick for an exact prediction", () => {
    expect(roundScore(0, 0)).toBe(20);
    expect(roundScore(3, 3)).toBe(50);
  });

  it("charges 10 per trick of deviation in either direction", () => {
    expect(roundScore(3, 1)).toBe(-20);
    expect(roundScore(1, 3)).toBe(-20);
  });

  it("returns null while either value is missing", () => {
    expect(roundScore(null, 2)).toBeNull();
    expect(roundScore(2, null)).toBeNull();
    expect(roundScore(undefined, undefined)).toBeNull();
  });
});

describe("effectiveBid and the Wolke", () => {
  it("returns the entered bid when no Wolke applies", () => {
    const r = round({ a: 2 }, { a: 2 });
    expect(effectiveBid(r, "a")).toBe(2);
  });

  it("shifts the holder's bid by the Wolke delta", () => {
    const up = round({ a: 2 }, { a: 3 }, { wolke: { playerId: "a", delta: 1 } });
    expect(effectiveBid(up, "a")).toBe(3);
    // Scored against the shifted bid: 3 = 3 is exact.
    expect(playerRoundScore(up, "a")).toBe(50);

    const down = round({ a: 2 }, { a: 1 }, { wolke: { playerId: "a", delta: -1 } });
    expect(effectiveBid(down, "a")).toBe(1);
    expect(playerRoundScore(down, "a")).toBe(30);
  });

  it("leaves other players' bids untouched", () => {
    const r = round({ a: 2, b: 2 }, { a: 2, b: 2 }, { wolke: { playerId: "a", delta: 1 } });
    expect(effectiveBid(r, "b")).toBe(2);
    expect(playerRoundScore(r, "b")).toBe(40);
  });

  it("returns null for a player who has not bid", () => {
    expect(effectiveBid(round({ a: null }, { a: null }), "a")).toBeNull();
  });

  it("offers only ±1 shifts that stay within 0..cards in the round", () => {
    // Round index 2 → 3 cards. A bid of 0 cannot go down, a bid of 3 cannot go up.
    expect(wolkeDeltaOptions(round({ a: 0 }, {}), "a", 2)).toEqual([1]);
    expect(wolkeDeltaOptions(round({ a: 3 }, {}), "a", 2)).toEqual([-1]);
    expect(wolkeDeltaOptions(round({ a: 1 }, {}), "a", 2)).toEqual([-1, 1]);
  });

  it("offers both shifts when no bid was entered yet", () => {
    expect(wolkeDeltaOptions(round({ a: null }, {}), "a", 2)).toEqual([-1, 1]);
  });
});

describe("the Bombe", () => {
  it("removes one trick from the round", () => {
    expect(tricksInRound(round({}, {}), 4)).toBe(5);
    expect(tricksInRound(round({}, {}, { bombTrick: true }), 4)).toBe(4);
  });

  it("never goes below zero", () => {
    expect(tricksInRound(round({}, {}, { bombTrick: true }), 0)).toBe(0);
  });

  it("treats a missing round as zero tricks", () => {
    expect(tricksInRound(undefined, 0)).toBe(1);
  });
});

describe("totals", () => {
  const game = createWizardGame(players, 3, "Standard", false);
  game.rounds = [
    round({ a: 1, b: 0, c: 1 }, { a: 1, b: 0, c: 0 }),
    round({ a: 2, b: 0, c: 0 }, { a: 0, b: 1, c: 1 }),
    round({ a: null, b: null, c: null }, { a: null, b: null, c: null }),
  ];

  it("sums the scored rounds and skips the open ones", () => {
    // a: 30 exact, then bid 2 got 0 → -20
    expect(totalScore(game, "a")).toBe(10);
    // b: 20 exact, then bid 0 got 1 → -10
    expect(totalScore(game, "b")).toBe(10);
    // c: bid 1 got 0 → -10, then bid 0 got 1 → -10
    expect(totalScore(game, "c")).toBe(-20);
  });

  it("gives running totals per round", () => {
    expect(scoreAfterRound(game, "a", 0)).toBe(30);
    expect(scoreAfterRound(game, "a", 1)).toBe(10);
    expect(scoreAfterRound(game, "a", 2)).toBe(10);
  });

  it("counts exact bids and rounds actually played", () => {
    expect(exactBidCount(game, "a")).toBe(1);
    expect(exactBidCount(game, "c")).toBe(0);
    expect(roundsPlayedBy(game, "a")).toBe(2);
  });

  it("sorts standings highest first, ties keeping seating order", () => {
    expect(standings(game).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

describe("round and game state", () => {
  it("creates rounds with a null entry per player", () => {
    const r = createRound(players);
    expect(r.bids).toEqual({ a: null, b: null, c: null });
    expect(r.tricks).toEqual({ a: null, b: null, c: null });
    expect(hasAnyEntry(r)).toBe(false);
  });

  it("distinguishes a deliberate 0 from a missing entry", () => {
    expect(hasAnyEntry(round({ a: 0 }, { a: null }))).toBe(true);
    expect(hasAnyEntry(round({ a: null }, { a: null }))).toBe(false);
  });

  it("counts a bomb mark or a Wolke as an entry", () => {
    expect(hasAnyEntry(round({ a: null }, { a: null }, { bombTrick: true }))).toBe(true);
    expect(
      hasAnyEntry(round({ a: null }, { a: null }, { wolke: { playerId: "a", delta: 1 } })),
    ).toBe(true);
  });

  it("knows when all bids or all tricks are in", () => {
    const partial = round({ a: 1, b: 1, c: null }, { a: null, b: null, c: null });
    expect(allBidsEntered(partial, players)).toBe(false);
    expect(allTricksEntered(partial, players)).toBe(false);

    const bidsIn = round({ a: 1, b: 1, c: 0 }, { a: null, b: null, c: null });
    expect(allBidsEntered(bidsIn, players)).toBe(true);
  });

  it("creates a game with one round per planned round", () => {
    const game = createWizardGame(players, 5, "Standard", true, ALL_SPECIAL_CARDS);
    expect(game.rounds).toHaveLength(5);
    expect(game.totalRounds).toBe(5);
    expect(game.plusMinusOne).toBe(true);
    expect(game.specialCards).toEqual(ALL_SPECIAL_CARDS);
    expect(game.startedAt).toBeNull();
    expect(game.finishedAt).toBeNull();
  });

  it("is finished only when every planned round is complete", () => {
    const game = createWizardGame(players, 2, "Standard", false);
    expect(isGameFinished(game)).toBe(false);

    game.rounds = [
      round({ a: 1, b: 0, c: 0 }, { a: 1, b: 0, c: 0 }),
      round({ a: 1, b: 1, c: 0 }, { a: 0, b: 1, c: 1 }),
    ];
    expect(isGameFinished(game)).toBe(true);
  });

  it("points at the first incomplete round, or the last when all are done", () => {
    const game = createWizardGame(players, 3, "Standard", false);
    expect(firstOpenRound(game)).toBe(0);

    game.rounds[0] = round({ a: 1, b: 0, c: 0 }, { a: 1, b: 0, c: 0 });
    expect(firstOpenRound(game)).toBe(1);

    game.rounds[1] = round({ a: 1, b: 0, c: 0 }, { a: 1, b: 0, c: 0 });
    game.rounds[2] = round({ a: 1, b: 0, c: 0 }, { a: 1, b: 0, c: 0 });
    expect(firstOpenRound(game)).toBe(2);
  });

  it("refuses to shrink below the last round that holds entries", () => {
    const game = createWizardGame(players, 5, "Standard", false);
    expect(minAllowedRounds(game)).toBe(1);

    game.rounds[2] = round({ a: 1, b: null, c: null }, { a: null, b: null, c: null });
    expect(minAllowedRounds(game)).toBe(3);
  });
});

describe("dealer rotation", () => {
  const game = createWizardGame(players, 4, "Standard", false);

  it("moves the deal one seat to the left each round", () => {
    expect(dealerIndex(game, 0)).toBe(0);
    expect(dealerIndex(game, 1)).toBe(1);
    expect(dealerIndex(game, 3)).toBe(0);
  });

  it("starts the bidding with the dealer's left neighbour", () => {
    expect(biddingOrder(game, 0).map((p) => p.id)).toEqual(["b", "c", "a"]);
    expect(biddingOrder(game, 1).map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("survives an empty player list", () => {
    const empty = createWizardGame([], 1, "Standard", false);
    expect(dealerIndex(empty, 0)).toBe(0);
    expect(biddingOrder(empty, 0)).toEqual([]);
  });
});
