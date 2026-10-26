import { describe, expect, it } from "vitest";

import { shareText } from "./config";
import { describeStep, formatLoss } from "./feedback";
import { dateKey } from "./puzzles";
import { runningQuizGame } from "./resume";
import { loadDay, loadDays, loadTutorialSeen, quizStorage, saveDay, saveTutorialSeen } from "./storage";
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

  it("calls the Wunder field Kniffel", () => {
    const step: QuizStep = {
      kind: "score",
      dice: [6, 6, 6, 6, 1],
      rollsLeft: 0,
      category: "Chance",
      points: 25,
      best: "Wunder",
      shouldRoll: false,
      loss: 1.2,
    };
    expect(describeStep(step).better).toBe("Kniffel");
    expect(describeStep({ ...step, category: "Wunder", points: 0 }).chosen).toBe("Kniffel streichen");
  });

  it("formats losses with a German decimal comma", () => {
    expect(formatLoss(2.46)).toBe("2,5");
    expect(formatLoss(0.06)).toBe("0,1");
  });
});

describe("shareText", () => {
  it("shows one square per puzzle and the total", () => {
    expect(shareText("2026-10-25", [100, 89, 52])).toBe("🧠 Kniffel-Quiz 25.10.2026\n🟩🟨🟧 241/300");
    expect(shareText("2026-10-25", [0, 12, 80])).toBe("🧠 Kniffel-Quiz 25.10.2026\n⬛⬛🟨 92/300");
    expect(shareText("2026-10-25", [100, 95, 93])).toBe("🧠 Kniffel-Quiz 25.10.2026\n🟩🟩🟩 288/300");
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

describe("day storage", () => {
  const day = (date: string): QuizDay => {
    const progress = { dice: [1, 2, 3, 4, 5], rollsLeft: 0 as const, steps: [], done: false };
    const puzzle = { card: {}, dice: [1, 2, 3, 4, 5], rollsLeft: 0 as const, nextRolls: [] };
    return { date, puzzles: [puzzle, puzzle, puzzle], progress: [progress, progress, progress], startedAt: 0 };
  };

  it("keeps past days next to today's, which also takes the game slot", () => {
    saveDay(day("2026-10-01"));
    saveDay(day(dateKey()));
    expect(loadDay("2026-10-01")?.date).toBe("2026-10-01");
    expect(quizStorage.loadGame()?.date).toBe(dateKey());
    expect(Object.keys(loadDays())).toEqual(expect.arrayContaining(["2026-10-01", dateKey()]));
  });

  it("still finds a day stored only in the game slot", () => {
    quizStorage.saveGame(day("2026-10-02"));
    expect(loadDay("2026-10-02")?.date).toBe("2026-10-02");
    expect(loadDay("2026-10-03")).toBeNull();
  });
});

describe("tutorial flag", () => {
  it("is unset for first timers and remembered once seen", () => {
    expect(loadTutorialSeen()).toBe(false);
    saveTutorialSeen();
    expect(loadTutorialSeen()).toBe(true);
  });
});
