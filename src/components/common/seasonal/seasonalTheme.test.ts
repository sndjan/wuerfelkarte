import { describe, expect, it } from "vitest";

import { THEME_EMOJIS, seasonFor } from "./useSeasonalTheme";

const on = (iso: string) => seasonFor(new Date(`${iso}T12:00:00`));

describe("seasonFor", () => {
  it("decorates Halloween from 20 October to 2 November", () => {
    expect(on("2026-10-19")).toBe("none");
    expect(on("2026-10-20")).toBe("Halloween");
    expect(on("2026-10-31")).toBe("Halloween");
    expect(on("2026-11-02")).toBe("Halloween");
    expect(on("2026-11-03")).toBe("none");
  });

  it("decorates Christmas from 20 November across the turn of the year", () => {
    expect(on("2026-11-19")).toBe("none");
    expect(on("2026-11-20")).toBe("Christmas");
    expect(on("2026-12-25")).toBe("Christmas");
    expect(on("2027-01-01")).toBe("Christmas");
    expect(on("2027-01-10")).toBe("Christmas");
    expect(on("2027-01-11")).toBe("none");
  });

  it("decorates Easter from 22 March to 12 April", () => {
    expect(on("2026-03-21")).toBe("none");
    expect(on("2026-03-22")).toBe("Easter");
    expect(on("2026-04-12")).toBe("Easter");
    expect(on("2026-04-13")).toBe("none");
  });

  it("leaves the rest of the year undecorated", () => {
    for (const day of ["2026-02-14", "2026-06-01", "2026-08-03", "2026-05-20"]) {
      expect(on(day)).toBe("none");
    }
  });

  it("has confetti emojis for every season", () => {
    for (const theme of ["Halloween", "Christmas", "Easter", "none"] as const) {
      expect(THEME_EMOJIS[theme].length).toBeGreaterThan(0);
    }
  });
});
