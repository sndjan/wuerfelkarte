import { beforeEach, describe, expect, it } from "vitest";

import {
  bucketCounts,
  bucketIndex,
  bucketLabel,
  flushSubmission,
  isSubmitted,
  queueSubmission,
  standing,
} from "./distribution";

describe("buckets", () => {
  it("splits the top of the scale finer and gives a perfect day its own bar", () => {
    expect(bucketIndex(0)).toBe(0);
    expect(bucketIndex(179)).toBe(0);
    expect(bucketIndex(180)).toBe(1);
    expect(bucketIndex(254)).toBe(3);
    expect(bucketIndex(299)).toBe(6);
    expect(bucketIndex(300)).toBe(7);
    expect(bucketLabel(0)).toBe("<180");
    expect(bucketLabel(7)).toBe("300");
  });

  it("adds up the players per bar", () => {
    expect(
      bucketCounts([
        { total: 100, players: 2 },
        { total: 150, players: 1 },
        { total: 270, players: 4 },
        { total: 300, players: 3 },
      ]),
    ).toEqual([3, 0, 0, 0, 0, 4, 0, 3]);
  });
});

describe("standing", () => {
  const counts = [
    { total: 200, players: 2 },
    { total: 250, players: 1 },
    { total: 300, players: 2 },
  ];

  it("compares only with the other players when the own result is counted", () => {
    expect(standing(counts, 250, true)).toEqual({ others: 4, betterThan: 50, sameAs: 0 });
    expect(standing(counts, 300, true)).toEqual({ others: 4, betterThan: 75, sameAs: 25 });
  });

  it("compares with everyone when the own result is not counted", () => {
    expect(standing(counts, 250, false)).toEqual({ others: 5, betterThan: 40, sameAs: 20 });
  });

  it("copes with nobody else", () => {
    expect(standing([{ total: 280, players: 1 }], 280, true)).toEqual({
      others: 0,
      betterThan: 0,
      sameAs: 0,
    });
  });
});

describe("submission queue", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the first result of a day and a fresh token per day", () => {
    queueSubmission("2026-10-26", [100, 90, 80]);
    const first = JSON.parse(localStorage.getItem("quiz:submission")!);
    queueSubmission("2026-10-26", [0, 0, 0]);
    expect(JSON.parse(localStorage.getItem("quiz:submission")!)).toEqual(first);
    expect(first).toMatchObject({ points: [100, 90, 80], sent: false });

    queueSubmission("2026-10-27", [50, 50, 50]);
    expect(JSON.parse(localStorage.getItem("quiz:submission")!).token).not.toBe(first.token);
  });

  it("stays queued without a backend", async () => {
    queueSubmission("2026-10-26", [100, 90, 80]);
    await flushSubmission();
    expect(isSubmitted("2026-10-26")).toBe(false);
  });
});
