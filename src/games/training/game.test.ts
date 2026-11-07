import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SOLVER_TABLE_PATH, solverFromTable, type Solver } from "@/games/yatzy/solver";
import { seededRandom } from "@/games/quiz/puzzles";
import {
  TURNS,
  allSteps,
  applyKeep,
  applyRoll,
  applyScore,
  bestMove,
  biggestMistakes,
  buildMatch,
  isFinished,
  newGame,
  totalScore,
  trainingStats,
  verdict,
} from "./game";
import { runningTrainingGame } from "./resume";
import { trainingStorage } from "./storage";
import type { TrainingGame } from "./types";

let solver: Solver;

beforeAll(() => {
  const file = readFileSync(`public${SOLVER_TABLE_PATH}`);
  solver = solverFromTable(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
});

/** A game whose first roll landed on these dice. */
const withDice = (dice: number[]): TrainingGame => {
  const game = newGame(0);
  return { ...game, current: { ...game.current, rolled: true, dice } };
};

/** Plays a whole game, always taking the solver's best move. */
function playOptimal(random: () => number): TrainingGame {
  let game = newGame(0);
  while (!isFinished(game)) {
    game = applyRoll(game, random);
    for (;;) {
      const best = bestMove(solver, game)!;
      if (best.kind === "score") {
        game = applyScore(solver, game, best.category, 1000);
        break;
      }
      const remaining = [...best.dice];
      const held = game.current.dice.map((d) => {
        const i = remaining.indexOf(d);
        if (i === -1) return false;
        remaining.splice(i, 1);
        return true;
      });
      game = applyKeep(solver, game, held, random);
    }
  }
  return game;
}

describe("training game", () => {
  it("starts unrolled and rolls five dice", () => {
    const game = applyRoll(newGame(0), seededRandom("a"));
    expect(game.current.rolled).toBe(true);
    expect(game.current.dice).toHaveLength(5);
    expect(game.current.dice.every((d) => d >= 1 && d <= 6)).toBe(true);
    expect(game.current.steps).toEqual([]);
    // Rolling twice does nothing.
    expect(applyRoll(game)).toBe(game);
  });

  it("grades a keep and rerolls only the free dice", () => {
    const game = withDice([6, 6, 6, 2, 1]);
    const next = applyKeep(solver, game, [true, true, true, false, false], seededRandom("b"));
    expect(next.current.dice.slice(0, 3)).toEqual([6, 6, 6]);
    expect(next.current.rollsLeft).toBe(1);
    expect(next.current.steps).toHaveLength(1);
    expect(next.current.steps[0]).toMatchObject({ kind: "keep", kept: [6, 6, 6], loss: 0 });
  });

  it("flags a bad keep with its loss and the better move", () => {
    const next = applyKeep(solver, withDice([6, 6, 6, 2, 1]), [false, false, false, true, true]);
    const step = next.current.steps[0];
    expect(step.loss).toBeGreaterThan(3);
    expect(step.kind === "keep" && step.best).toEqual([6, 6, 6]);
  });

  it("refuses to reroll when every die is held", () => {
    const game = withDice([1, 2, 3, 4, 5]);
    expect(applyKeep(solver, game, [true, true, true, true, true])).toBe(game);
  });

  it("enters the dice, adds the bonus and starts the next turn", () => {
    const game = withDice([5, 5, 5, 5, 5]);
    const next = applyScore(solver, game, "Wunder");
    expect(next.card.Wunder).toBe(50);
    expect(next.turns).toHaveLength(1);
    expect(next.current.rolled).toBe(false);
    expect(totalScore(next)).toBe(50);
    expect(allSteps(next)).toHaveLength(1);
  });

  it("counts the upper bonus once it is reached", () => {
    const game: TrainingGame = {
      ...withDice([6, 6, 6, 6, 1]),
      card: { Fünfer: 25, Vierer: 16 },
      turns: [
        { steps: [], category: "Fünfer", points: 25, bonus: 0 },
        { steps: [], category: "Vierer", points: 16, bonus: 0 },
      ],
    };
    const next = applyScore(solver, game, "Sechser");
    expect(next.turns.at(-1)).toMatchObject({ points: 24, bonus: 35 });
    expect(totalScore(next)).toBe(25 + 16 + 24 + 35);
  });

  it("plays a full optimal game without a single loss", () => {
    const game = playOptimal(seededRandom("optimal"));
    expect(game.turns).toHaveLength(TURNS);
    expect(game.finishedAt).toBe(1000);
    const stats = trainingStats(game);
    expect(stats.loss).toBe(0);
    expect(stats.optimal).toBe(stats.decisions);
    expect(stats.rating).toBe(100);
    expect(biggestMistakes(game)).toEqual([]);
    expect(buildMatch(game).players[0].score).toBe(totalScore(game));
    // A finished game takes no more moves.
    expect(applyRoll(game)).toBe(game);
  });

  it("judges moves by the points they give away", () => {
    expect(verdict(0)).toBe("best");
    expect(verdict(0.5)).toBe("great");
    expect(verdict(2)).toBe("good");
    expect(verdict(5)).toBe("inaccurate");
    expect(verdict(12)).toBe("mistake");
  });
});

describe("running training game", () => {
  beforeEach(() => localStorage.clear());

  it("only shows up once the first roll was made", () => {
    trainingStorage.saveGame(newGame(0));
    expect(runningTrainingGame()).toBeNull();
    trainingStorage.saveGame(applyRoll(newGame(0)));
    expect(runningTrainingGame()).toMatchObject({ href: "/training", progress: "Zug 1 von 13 · 0 Punkte" });
    runningTrainingGame()!.discard!();
    expect(trainingStorage.loadGame()).toBeNull();
  });
});
