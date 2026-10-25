import { describe, expect, it } from "vitest";

import { shareText } from "./config";
import { describeStep, formatLoss } from "./feedback";
import { dateKey } from "./puzzles";
import { runningQuizGame } from "./resume";
import { quizStorage } from "./storage";
import type { QuizDay, QuizStep } from "./types";

describe("describeStep", () => {
  it("words a keep decision", () => {
    const step: QuizStep = {
      kind: "keep",
      dice: [1, 2, 3, 3, 3],
      rollsLeft: 2,
      kept: [1, 2, 3],
      best: [3, 3, 3],
      loss: 2.4,
    };
    expect(describeStep(step)).toEqual({ chosen: "1 2 3 halten", better: "3 3 3 halten", loss: 2.4 });
    expect(describeStep({ ...step, kept: [], loss: 0 })).toMatchObject({
      chosen: "Alle neu würfeln",
      better: null,
    });
  });

  it("tells the player to roll on when entering early was the mistake", () => {
    const step: QuizStep = {
      kind: "score",
      dice: [6, 6, 6, 6, 1],
      rollsLeft: 2,
      category: "Viererpasch",
      points: 25,
      best: "Viererpasch",
      shouldRoll: true,
      loss: 4.6,
    };
    expect(describeStep(step)).toEqual({
      chosen: "Viererpasch (25)",
      better: "Weiterwürfeln",
      loss: 4.6,
    });
  });

  it("formats losses with a German decimal comma", () => {
    expect(formatLoss(2.46)).toBe("2,5");
    expect(formatLoss(0.06)).toBe("0,1");
  });
});

describe("shareText", () => {
  it("shows one square per puzzle and the total", () => {
    expect(shareText("2026-10-25", [10, 6, 2])).toBe("🧠 Kniffel-Quiz 25.10.2026\n🟩🟨🟧 18/30");
    expect(shareText("2026-10-25", [0, 0, 9])).toBe("🧠 Kniffel-Quiz 25.10.2026\n⬛⬛🟨 9/30");
  });
});

describe("runningQuizGame", () => {
  const day = (patch: Partial<QuizDay> = {}): QuizDay => {
    const progress = { dice: [1, 2, 3, 4, 5], rollsLeft: 0 as const, steps: [], done: false };
    const puzzle = { card: {}, dice: [1, 2, 3, 4, 5], rollsLeft: 0 as const, nextRolls: [] };
    return {
      date: dateKey(),
      puzzles: [puzzle, puzzle, puzzle],
      progress: [progress, progress, progress],
      startedAt: 0,
      ...patch,
    };
  };
  const step: QuizStep = {
    kind: "score",
    dice: [1, 2, 3, 4, 5],
    rollsLeft: 0,
    category: "Chance",
    points: 15,
    best: "Chance",
    shouldRoll: false,
    loss: 0,
  };

  it("offers today's quiz only once a decision was made", () => {
    quizStorage.saveGame(day());
    expect(runningQuizGame()).toBeNull();

    const started = day();
    started.progress = [{ ...started.progress[0], steps: [step], done: true }, ...started.progress.slice(1)];
    quizStorage.saveGame(started);
    expect(runningQuizGame()).toMatchObject({ href: "/quiz", progress: "Aufgabe 2 von 3" });
  });

  it("forgets a finished or an old day", () => {
    quizStorage.saveGame(day({ finishedAt: 1 }));
    expect(runningQuizGame()).toBeNull();
    quizStorage.saveGame(day({ date: "2000-01-01" }));
    expect(runningQuizGame()).toBeNull();
  });
});
