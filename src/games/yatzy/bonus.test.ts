import { describe, expect, it } from "vitest";

import { bonusPace } from "./bonus";

const CLASSIC = { fields: ["Einser", "Zweier", "Dreier", "Vierer", "Fünfer", "Sechser"], minSum: 63 };

describe("bonusPace", () => {
  it("is on track with three of each so far", () => {
    expect(bonusPace({ Einser: 3, Zweier: 6, Dreier: 9 }, CLASSIC, 5)).toEqual({ sum: 18, pace: "onTrack" });
  });

  it("falls behind by how many of each open number are still needed", () => {
    // 32 missing with Einser and Sechser open: 32 / 7 ≈ 4.6 of each.
    expect(bonusPace({ Zweier: 6, Dreier: 3, Vierer: 12, Fünfer: 10 }, CLASSIC, 5).pace).toBe("farBehind");
    // 15 missing with Vierer open: 3.75 of each.
    expect(bonusPace({ Einser: 1, Zweier: 4, Dreier: 9, Fünfer: 10, Sechser: 24 }, CLASSIC, 5).pace).toBe("behind");
  });

  it("knows when the bonus is reached or out of reach", () => {
    expect(bonusPace({ Einser: 3, Zweier: 6, Dreier: 9, Vierer: 12, Fünfer: 15, Sechser: 18 }, CLASSIC, 5).pace).toBe(
      "reached",
    );
    expect(bonusPace({ Zweier: "X", Dreier: 3, Vierer: 4, Fünfer: 5, Sechser: 6 }, CLASSIC, 5).pace).toBe("lost");
  });

  it("counts a doubled field twice", () => {
    expect(bonusPace({ Sechser: 18 }, CLASSIC, 5, new Set(["Sechser"])).sum).toBe(36);
  });
});
