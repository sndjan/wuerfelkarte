import { describe, expect, it } from "vitest";

import {
  BULL,
  DEFAULT_LEGS_TO_WIN,
  DOUBLE_BULL,
  MAX_LEGS_TO_WIN,
  MAX_START_SCORE,
  MIN_START_SCORE,
  MISS,
  clampLegsToWin,
  clampStartScore,
  createDartsGame,
  createLeg,
  dart,
  dartLabel,
  dartValue,
  hasAnyDart,
  isDartPossible,
  isDoubleDart,
  legStarterId,
  legState,
  legsWon,
  matchWinnerId,
  playTurn,
  playerStats,
  satisfiesIn,
  satisfiesOut,
  standings,
  withoutLastDart,
} from "./scoring";
import type { DartsRules as Rules } from "./scoring";
import type { DartsGame, DartsLeg, DartsPlayer, DartsTurn } from "./types";

const players: DartsPlayer[] = [
  { id: "a", name: "Anna" },
  { id: "b", name: "Ben" },
];

const rules = (over: Partial<Rules> = {}): Rules => ({
  startScore: 501,
  inRule: "straight",
  outRule: "double",
  ...over,
});

const turn = (playerId: string, ...darts: DartsTurn["darts"]): DartsTurn => ({
  playerId,
  darts,
});

const leg = (turns: DartsTurn[], startIndex = 0): DartsLeg => ({
  startIndex,
  turns,
});

const gameWith = (
  legs: DartsLeg[],
  over: Partial<DartsGame> = {},
): DartsGame => ({
  ...createDartsGame(
    players,
    {
      startScore: 501,
      inRule: "straight",
      outRule: "double",
      legsToWin: DEFAULT_LEGS_TO_WIN,
    },
    "X01",
  ),
  legs,
  ...over,
});

const T20 = dart(20, 3);
const D20 = dart(20, 2);
const S20 = dart(20, 1);

describe("dart primitives", () => {
  it("values every ring", () => {
    expect(dartValue(T20)).toBe(60);
    expect(dartValue(D20)).toBe(40);
    expect(dartValue(S20)).toBe(20);
    expect(dartValue(BULL)).toBe(25);
    expect(dartValue(DOUBLE_BULL)).toBe(50);
    expect(dartValue(MISS)).toBe(0);
  });

  it("labels darts the way a scoreboard does", () => {
    expect(dartLabel(T20)).toBe("T20");
    expect(dartLabel(D20)).toBe("D20");
    expect(dartLabel(S20)).toBe("20");
    expect(dartLabel(BULL)).toBe("25");
    expect(dartLabel(DOUBLE_BULL)).toBe("Bull");
    expect(dartLabel(MISS)).toBe("Miss");
  });

  it("knows which rings exist", () => {
    expect(isDartPossible(dart(25, 3))).toBe(false);
    expect(isDartPossible(DOUBLE_BULL)).toBe(true);
    expect(isDartPossible(dart(0, 2))).toBe(false);
  });

  it("counts the inner bull as a double", () => {
    expect(isDoubleDart(DOUBLE_BULL)).toBe(true);
    expect(isDoubleDart(BULL)).toBe(false);
    expect(isDoubleDart(MISS)).toBe(false);
  });

  it("applies the in and out rules per ring", () => {
    expect(satisfiesIn(S20, "straight")).toBe(true);
    expect(satisfiesIn(S20, "double")).toBe(false);
    expect(satisfiesIn(T20, "double")).toBe(false);
    expect(satisfiesIn(T20, "master")).toBe(true);
    expect(satisfiesIn(MISS, "straight")).toBe(false);
    expect(satisfiesOut(S20, "double")).toBe(false);
    expect(satisfiesOut(T20, "master")).toBe(true);
    expect(satisfiesOut(S20, "straight")).toBe(true);
  });
});

describe("playTurn", () => {
  it("subtracts a full visit", () => {
    const result = playTurn("a", [T20, T20, T20], 501, true, rules());
    expect(result.after).toBe(321);
    expect(result.score).toBe(180);
    expect(result.busted).toBe(false);
    expect(result.complete).toBe(true);
  });

  it("stays open while darts are left", () => {
    const result = playTurn("a", [T20], 501, true, rules());
    expect(result.complete).toBe(false);
  });

  it("checks out on a double", () => {
    const result = playTurn("a", [D20], 40, true, rules());
    expect(result.checkout).toBe(true);
    expect(result.after).toBe(0);
    expect(result.complete).toBe(true);
  });

  it("checks out on the bullseye", () => {
    expect(playTurn("a", [DOUBLE_BULL], 50, true, rules()).checkout).toBe(true);
  });

  it("busts on a non-double finish and keeps the score", () => {
    const result = playTurn("a", [S20], 20, true, rules());
    expect(result.busted).toBe(true);
    expect(result.checkout).toBe(false);
    expect(result.after).toBe(20);
    expect(result.score).toBe(0);
  });

  it("busts below zero and ignores the rest of the visit", () => {
    const result = playTurn("a", [T20, S20], 42, true, rules());
    expect(result.busted).toBe(true);
    expect(result.after).toBe(42);
    expect(result.complete).toBe(true);
  });

  it("busts when a visit would leave exactly one", () => {
    expect(playTurn("a", [dart(9)], 10, true, rules()).busted).toBe(true);
  });

  it("allows leaving one and finishing on a single with straight out", () => {
    const straight = rules({ outRule: "straight" });
    expect(playTurn("a", [dart(9)], 10, true, straight).after).toBe(1);
    expect(playTurn("a", [dart(1)], 1, true, straight).checkout).toBe(true);
  });

  it("finishes on a treble with master out", () => {
    expect(playTurn("a", [T20], 60, true, rules({ outRule: "master" })).checkout).toBe(
      true,
    );
    expect(playTurn("a", [T20], 60, true, rules()).busted).toBe(true);
  });

  it("throws for nothing until the opening double lands", () => {
    const result = playTurn("a", [S20, D20, S20], 501, false, rules({ inRule: "double" }));
    expect(result.after).toBe(441);
    expect(result.score).toBe(60);
    expect(result.openedHere).toBe(true);
  });

  it("rewinds the opening dart when the same visit busts", () => {
    const result = playTurn(
      "a",
      [D20, T20],
      50,
      false,
      rules({ startScore: 50, inRule: "double" }),
    );
    expect(result.busted).toBe(true);
    expect(result.after).toBe(50);
    expect(result.openedHere).toBe(false);
  });
});

describe("legState", () => {
  it("tracks the running visit and who is at the oche", () => {
    const state = legState(players, leg([turn("a", T20)]), rules({ startScore: 101 }));
    expect(state.remaining.a).toBe(41);
    expect(state.remaining.b).toBe(101);
    expect(state.currentPlayerId).toBe("a");
    expect(state.dartsLeftInTurn).toBe(2);
    expect(state.openTurnIndex).toBe(0);
  });

  it("passes the oche on once a visit is complete", () => {
    const state = legState(
      players,
      leg([turn("a", T20, T20, T20)]),
      rules({ startScore: 101 }),
    );
    // 180 into 101 is a bust, so the score is back where it started.
    expect(state.remaining.a).toBe(101);
    expect(state.currentPlayerId).toBe("b");
    expect(state.dartsLeftInTurn).toBe(3);
    expect(state.openTurnIndex).toBeNull();
  });

  it("records the checkout and closes the leg", () => {
    const state = legState(
      players,
      leg([turn("a", T20, dart(1), D20)]),
      rules({ startScore: 101 }),
    );
    expect(state.winnerId).toBe("a");
    expect(state.winnerDarts).toBe(3);
    expect(state.currentPlayerId).toBeNull();
    expect(state.remaining.a).toBe(0);
  });

  it("starts with whoever the leg says, even with three players", () => {
    const three = [...players, { id: "c", name: "Cleo" }];
    expect(legStarterId(three, createLeg(1, three.length))).toBe("b");
    expect(legStarterId(three, createLeg(3, three.length))).toBe("a");
    expect(legState(three, leg([], 2), rules()).currentPlayerId).toBe("c");
  });
});

describe("match state", () => {
  const decided = gameWith(
    [
      leg([turn("a", T20, dart(1), D20)]),
      leg([turn("b", T20, dart(1), D20)], 1),
      leg([turn("a", T20, dart(1), D20)]),
    ],
    { legsToWin: 2, startScore: 101 },
  );

  it("counts legs and finds the match winner", () => {
    expect(legsWon(decided, "a")).toBe(2);
    expect(legsWon(decided, "b")).toBe(1);
    expect(matchWinnerId(decided)).toBe("a");
    expect(standings(decided).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("has no winner while the target is out of reach", () => {
    expect(matchWinnerId(gameWith([leg([])], { startScore: 101 }))).toBeNull();
  });

  it("knows whether a dart was thrown at all", () => {
    expect(hasAnyDart(gameWith([leg([])]))).toBe(false);
    expect(hasAnyDart(gameWith([leg([turn("a", MISS)])]))).toBe(true);
  });
});

describe("playerStats", () => {
  const game = gameWith(
    [
      leg([
        turn("a", T20, T20, T20),
        turn("b", dart(1)),
        turn("a", dart(1), dart(10, 2)),
      ]),
    ],
    { startScore: 201 },
  );

  it("averages over every dart thrown, busts included", () => {
    const stats = playerStats(game, "a");
    expect(stats.dartsThrown).toBe(5);
    expect(stats.pointsScored).toBe(201);
    expect(stats.average).toBeCloseTo(120.6, 5);
  });

  it("counts the big visits and the quickest leg", () => {
    const stats = playerStats(game, "a");
    expect(stats.bestTurn).toBe(180);
    expect(stats.maximums).toBe(1);
    expect(stats.turns140).toBe(0);
    expect(stats.turns100).toBe(0);
    expect(stats.legsWon).toBe(1);
    expect(stats.bestLegDarts).toBe(5);
  });

  it("leaves a player who won nothing without a best leg", () => {
    expect(playerStats(game, "b").bestLegDarts).toBe(0);
    expect(playerStats(game, "b").average).toBeCloseTo(3, 5);
  });
});

describe("withoutLastDart", () => {
  const won = gameWith(
    [leg([turn("a", T20, dart(1), D20)])],
    { startScore: 101 },
  );

  it("takes back the checkout", () => {
    const undone = withoutLastDart(won);
    expect(undone).not.toBeNull();
    expect(undone!.legs[0].turns[0].darts).toHaveLength(2);
    expect(legState(players, undone!.legs[0], rules({ startScore: 101 })).winnerId).toBeNull();
  });

  it("drops a visit that loses its only dart", () => {
    const game = gameWith([leg([turn("a", T20), turn("b", T20)])]);
    const undone = withoutLastDart(game);
    expect(undone!.legs[0].turns).toHaveLength(1);
    expect(legState(players, undone!.legs[0], rules()).currentPlayerId).toBe("a");
  });

  it("reaches back into the previous leg", () => {
    const game = gameWith(
      [leg([turn("a", T20, dart(1), D20)]), leg([], 1)],
      { startScore: 101, finishedAt: 123 },
    );
    const undone = withoutLastDart(game);
    expect(undone!.legs).toHaveLength(1);
    expect(undone!.legs[0].turns[0].darts).toHaveLength(2);
    expect(undone!.finishedAt).toBeNull();
  });

  it("has nothing to undo on an untouched game", () => {
    expect(withoutLastDart(gameWith([leg([])]))).toBeNull();
  });
});

describe("settings clamps", () => {
  it("snaps a start score onto the x01 grid", () => {
    expect(clampStartScore(501)).toBe(501);
    expect(clampStartScore(480)).toBe(501);
    expect(clampStartScore(0)).toBe(MIN_START_SCORE);
    expect(clampStartScore(99999)).toBe(MAX_START_SCORE);
  });

  it("keeps the leg target in range", () => {
    expect(clampLegsToWin(3)).toBe(3);
    expect(clampLegsToWin(0)).toBe(1);
    expect(clampLegsToWin(99)).toBe(MAX_LEGS_TO_WIN);
  });
});
