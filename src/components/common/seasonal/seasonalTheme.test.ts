import { describe, expect, it } from "vitest";

import { THEME_EMOJIS, THEME_MOTIFS, seasonFor } from "./useSeasonalTheme";

const on = (iso: string) => seasonFor(new Date(`${iso}T12:00:00`));

describe("seasonFor", () => {
  it("decorates Halloween from 20 October to 2 November", () => {
    expect(on("2026-10-19")).toBe("Autumn");
    expect(on("2026-10-20")).toBe("Halloween");
    expect(on("2026-10-31")).toBe("Halloween");
    expect(on("2026-11-02")).toBe("Halloween");
    expect(on("2026-11-03")).toBe("Autumn");
  });

  it("decorates Christmas from 20 November across the turn of the year", () => {
    expect(on("2026-11-19")).toBe("Autumn");
    expect(on("2026-11-20")).toBe("Christmas");
    expect(on("2026-12-25")).toBe("Christmas");
    expect(on("2027-01-01")).toBe("Christmas");
    expect(on("2027-01-10")).toBe("Christmas");
    expect(on("2027-01-11")).toBe("Winter");
  });

  it("decorates Easter from 22 March to 12 April", () => {
    expect(on("2026-03-21")).toBe("Spring");
    expect(on("2026-03-22")).toBe("Easter");
    expect(on("2026-04-12")).toBe("Easter");
    expect(on("2026-04-13")).toBe("Spring");
  });

  it("fills the rest of the year with the four seasons", () => {
    expect(on("2027-01-11")).toBe("Winter");
    expect(on("2026-02-14")).toBe("Winter");
    expect(on("2028-02-29")).toBe("Winter");
    expect(on("2026-03-01")).toBe("Spring");
    expect(on("2026-05-20")).toBe("Spring");
    expect(on("2026-06-01")).toBe("Summer");
    expect(on("2026-08-31")).toBe("Summer");
    expect(on("2026-09-01")).toBe("Autumn");
    expect(on("2026-11-19")).toBe("Autumn");
  });

  it("leaves no day of the year undecorated", () => {
    for (let day = new Date("2026-01-01T12:00:00"); day.getFullYear() === 2026; day.setDate(day.getDate() + 1)) {
      expect(seasonFor(day)).not.toBe("none");
    }
  });

  it("has confetti emojis and three motifs for every season", () => {
    for (const theme of ["Halloween", "Christmas", "Easter", "Winter", "Spring", "Summer", "Autumn"] as const) {
      expect(THEME_EMOJIS[theme].length).toBeGreaterThan(0);
      expect(THEME_MOTIFS[theme]).toHaveLength(3);
    }
  });
});
