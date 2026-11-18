import { describe, expect, it } from "vitest";

import { guideChapters } from "./kniffel-strategie/chapters";
import { dailyTips, tipForDate } from "./tips";

describe("Tipp des Tages", () => {
  it("links only chapters that exist", () => {
    const slugs = new Set(guideChapters.map((c) => c.slug));
    for (const tip of dailyTips) expect(slugs.has(tip.chapter)).toBe(true);
  });

  it("has 20 tips", () => {
    expect(dailyTips).toHaveLength(20);
  });

  it("shows the next tip on the next day and wraps around", () => {
    const i = dailyTips.indexOf(tipForDate("2026-11-18"));
    expect(dailyTips.indexOf(tipForDate("2026-11-19"))).toBe((i + 1) % 20);
    expect(tipForDate("2026-11-18")).toBe(tipForDate("2026-12-08"));
  });

  it("crosses month and year ends", () => {
    const i = dailyTips.indexOf(tipForDate("2026-12-31"));
    expect(dailyTips.indexOf(tipForDate("2027-01-01"))).toBe((i + 1) % 20);
  });
});
