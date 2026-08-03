import { describe, expect, it } from "vitest";

import { buildShareText } from "@/games/shared/components/ShareResult";
import { shareConfig as wizardShareConfig } from "@/games/wizard/config";
import { shareConfig as flip7ShareConfig } from "@/games/flip7/config";
import { shareConfig as yatzyShareConfig } from "@/games/yatzy/config";

/**
 * Characterization tests for the three share-text builders.
 *
 * All three games share one builder in games/shared, driven by their config.
 * Ranks are numbered up to 10 for every game — that is the one deliberate
 * change from merging the three copies, which stopped at 6 for Wizard and
 * Flip 7.
 */

const DATE = new Date("2026-08-03T14:30:00Z");

/** Fixed formatting regardless of the machine's locale/timezone. */
const dateLine = `📆 ${DATE.toLocaleString(undefined, {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})}`;

const scored = (name: string, score: number, emoji?: string) => ({
  id: name,
  name,
  emoji,
  score,
});



describe("Yatzy share text", () => {
  it("renders header, date, mode and one ranked line per player", () => {
    const text = buildShareText(
      [scored("Anna", 20, "🦄"), scored("Ben", 30)],
      yatzyShareConfig("Wunder"),
      DATE,
    );

    expect(text).toBe(
      [
        "🎲 Würfelkarte - Ergebnis",
        dateLine,
        "⭐ Modus: Wunder",
        "",
        "🥇 Ben: 30 Punkte",
        "🥈 🦄 Anna: 20 Punkte",
        "",
        "Gespielt mit www.würfelkarte.com",
      ].join("\n"),
    );
  });

  it("gives tied players the same rank (dense ranking)", () => {
    const text = buildShareText(
      [scored("Anna", 30), scored("Ben", 30), scored("Cleo", 10)],
      yatzyShareConfig("Wunder"),
      DATE,
    );
    expect(text).toContain("🥇 Anna: 30 Punkte");
    expect(text).toContain("🥇 Ben: 30 Punkte");
    // Dense ranking: the next distinct score is rank 2, not rank 3.
    expect(text).toContain("🥈 Cleo: 10 Punkte");
  });

  it("numbers ranks up to 10", () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      scored(`P${i + 1}`, 100 - i * 10),
    );
    const text = buildShareText(players, yatzyShareConfig("Wunder"), DATE);
    for (const prefix of ["🥇 ", "🥈 ", "🥉 ", "4️⃣ ", "5️⃣ ", "6️⃣ ", "7️⃣ ", "8️⃣ ", "9️⃣ ", "🔟 "]) {
      expect(text).toContain(prefix);
    }
  });
});

describe("Wizard share text", () => {
  it("renders the Wizard header and mode label", () => {
    const text = buildShareText(
      [scored("Anna", 120), scored("Ben", 90, "🐸")],
      wizardShareConfig("Standard", false),
      DATE,
    );

    expect(text).toBe(
      [
        "🧙 Würfelkarte - Wizard Ergebnis",
        dateLine,
        "⭐ Modus: Standard",
        "",
        "🥇 Anna: 120 Punkte",
        "🥈 🐸 Ben: 90 Punkte",
        "",
        "Gespielt mit www.würfelkarte.com",
      ].join("\n"),
    );
  });

  it("appends the Plus/Minus Eins rule to the mode label when active", () => {
    const text = buildShareText(
      [scored("Anna", 10)],
      wizardShareConfig("Standard", true),
      DATE,
    );
    expect(text).toContain("⭐ Modus: Standard · Plus/Minus Eins");
  });

  it("names the 25 Jahre Edition", () => {
    const text = buildShareText(
      [scored("Anna", 10)],
      wizardShareConfig("25 Jahre Edition", false),
      DATE,
    );
    expect(text).toContain("⭐ Modus: 25 Jahre Edition");
  });

  it("handles negative totals", () => {
    const text = buildShareText(
      [scored("Anna", -40)],
      wizardShareConfig("Standard", false),
      DATE,
    );
    expect(text).toContain("🥇 Anna: -40 Punkte");
  });

  it("numbers ranks past 6 like the other games", () => {
    const players = Array.from({ length: 7 }, (_, i) => scored(`P${i + 1}`, 70 - i * 10));
    const text = buildShareText(players, wizardShareConfig("Standard", false), DATE);
    expect(text).toContain("7️⃣ P7: 10 Punkte");
  });
});

describe("Flip 7 share text", () => {
  it("renders the Flip 7 header and puts the target in the mode label", () => {
    const text = buildShareText(
      [scored("Anna", 205), scored("Ben", 180)],
      flip7ShareConfig("Standard", 200),
      DATE,
    );

    expect(text).toBe(
      [
        "7️⃣ Würfelkarte - Flip 7 Ergebnis",
        dateLine,
        "⭐ Modus: Standard · 200 Punkte",
        "",
        "🥇 Anna: 205 Punkte",
        "🥈 Ben: 180 Punkte",
        "",
        "Gespielt mit www.würfelkarte.com",
      ].join("\n"),
    );
  });

  it("numbers ranks past 6 like the other games", () => {
    const players = Array.from({ length: 7 }, (_, i) => scored(`P${i + 1}`, 70 - i * 10));
    const text = buildShareText(players, flip7ShareConfig("Standard", 200), DATE);
    expect(text).toContain("7️⃣ P7: 10 Punkte");
  });
});
