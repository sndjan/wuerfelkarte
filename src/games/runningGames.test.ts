import { describe, expect, it } from "vitest";

import { runningCaboGame } from "./cabo/resume";
import { createCaboGame } from "./cabo/scoring";
import { caboStorage } from "./cabo/storage";
import { loadRunningGames } from "./runningGames";
import { runningYatzyGame } from "./yatzy/resume";
import { YatzyGame, yatzyStorage } from "./yatzy/storage";
import { Points } from "./yatzy/types";

const players = [
  { id: "a", name: "Anna", emoji: "🦄" },
  { id: "b", name: "Ben" },
];

const emptySheet: Points = {
  Einser: 0,
  Zweier: 0,
  Dreier: 0,
  Vierer: 0,
  Fünfer: 0,
  Sechser: 0,
  Dreierpasch: 0,
  Viererpasch: 0,
  "Full House": 0,
  "Kleine Straße": 0,
  "Große Straße": 0,
  Wunder: 0,
  Chance: 0,
};

const fullSheet: Points = Object.fromEntries(
  Object.keys(emptySheet).map((key) => [key, "X"]),
) as Points;

const yatzyGame = (patch: Partial<YatzyGame> = {}): YatzyGame => ({
  id: "y1",
  gamemode: "Wunder",
  players: [
    { name: "Anna", points: { ...emptySheet, Einser: 3 } },
    { name: "Ben", points: emptySheet },
  ],
  startedAt: 1000,
  finishedAt: null,
  ...patch,
});

describe("running games", () => {
  it("offers a started card game until it is finished", () => {
    caboStorage.saveGame(createCaboGame(players, 100, "Standard"));
    expect(runningCaboGame()).toMatchObject({
      href: "/cabo/standard",
      progress: "Runde 1 · Ziel 100",
      players: [{ name: "Anna" }, { name: "Ben" }],
    });

    caboStorage.saveGame({
      ...createCaboGame(players, 100, "Standard"),
      finishedAt: 2000,
    });
    expect(runningCaboGame()).toBeNull();
  });

  it("ignores the player-less placeholder a bare board URL stores", () => {
    caboStorage.saveGame(createCaboGame([], 100, "Standard"));
    expect(runningCaboGame()).toBeNull();
  });

  it("offers a Yatzy sheet only once a field is filled in", () => {
    yatzyStorage.saveGame(yatzyGame({ startedAt: null }));
    expect(runningYatzyGame()).toBeNull();

    yatzyStorage.saveGame(yatzyGame());
    expect(runningYatzyGame()).toMatchObject({
      href: "/yatzy/wunder",
      progress: "Runde 1 von 13",
    });
  });

  it("drops a Yatzy sheet once every field is filled in", () => {
    yatzyStorage.saveGame(
      yatzyGame({
        players: [
          { name: "Anna", points: fullSheet },
          { name: "Ben", points: fullSheet },
        ],
      }),
    );
    expect(runningYatzyGame()).toBeNull();
  });

  it("collects every game left running", () => {
    caboStorage.saveGame(createCaboGame(players, 100, "Standard"));
    yatzyStorage.saveGame(yatzyGame());
    expect(loadRunningGames().map((g) => g.gameKey)).toEqual(["yatzy", "cabo"]);
  });
});
