import { describe, expect, it } from "vitest";

import { buildScoreText as buildYatzyText } from "./Share";
import { buildScoreText as buildWizardText } from "@/games/wizard/components/Share";
import { buildScoreText as buildFlip7Text } from "@/games/flip7/components/Share";
import type { Player, Points } from "./hooks/types";

/**
 * Characterization tests for the three share-text builders.
 *
 * These pin the *current* rank formatting, which differs between the games:
 * Yatzy numbers ranks up to 10, Wizard and Flip 7 stop at 6 and fall back to
 * a plain " 7. " label. The refactor unifies that later, and these expectations
 * change deliberately at that point.
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

/** A Yatzy player whose sheet adds up to `total`, put into the Chance field. */
const yatzyPlayer = (
  id: number,
  name: string,
  chance: number,
  emoji?: string,
): Player => ({
  id,
  name,
  emoji,
  points: { Chance: chance } as unknown as Points,
  score: chance,
});

describe("Yatzy share text", () => {
  it("renders header, date, mode and one ranked line per player", () => {
    const text = buildYatzyText(
      [yatzyPlayer(1, "Anna", 20, "🦄"), yatzyPlayer(2, "Ben", 30)],
      DATE,
      "Wunder",
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

  it("adds the upper-section bonus to the shared total", () => {
    const player: Player = {
      id: 1,
      name: "Anna",
      points: {
        Einser: 3,
        Zweier: 8,
        Dreier: 12,
        Vierer: 16,
        Fünfer: 10,
        Sechser: 14,
      } as unknown as Points,
      score: 0,
    };
    // 63 upper + 35 bonus
    expect(buildYatzyText([player], DATE, "Wunder")).toContain("Anna: 98 Punkte");
  });

  it("gives tied players the same rank (dense ranking)", () => {
    const text = buildYatzyText(
      [
        yatzyPlayer(1, "Anna", 30),
        yatzyPlayer(2, "Ben", 30),
        yatzyPlayer(3, "Cleo", 10),
      ],
      DATE,
      "Wunder",
    );
    expect(text).toContain("🥇 Anna: 30 Punkte");
    expect(text).toContain("🥇 Ben: 30 Punkte");
    // Dense ranking: the next distinct score is rank 2, not rank 3.
    expect(text).toContain("🥈 Cleo: 10 Punkte");
  });

  it("numbers ranks up to 10", () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      yatzyPlayer(i + 1, `P${i + 1}`, 100 - i * 10),
    );
    const text = buildYatzyText(players, DATE, "Wunder");
    for (const prefix of ["🥇 ", "🥈 ", "🥉 ", "4️⃣ ", "5️⃣ ", "6️⃣ ", "7️⃣ ", "8️⃣ ", "9️⃣ ", "🔟 "]) {
      expect(text).toContain(prefix);
    }
  });
});

describe("Wizard share text", () => {
  it("renders the Wizard header and mode label", () => {
    const text = buildWizardText(
      [scored("Anna", 120), scored("Ben", 90, "🐸")],
      "Standard",
      false,
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
    const text = buildWizardText([scored("Anna", 10)], "Standard", true, DATE);
    expect(text).toContain("⭐ Modus: Standard · Plus/Minus Eins");
  });

  it("names the 25 Jahre Edition", () => {
    const text = buildWizardText([scored("Anna", 10)], "25 Jahre Edition", false, DATE);
    expect(text).toContain("⭐ Modus: 25 Jahre Edition");
  });

  it("handles negative totals", () => {
    const text = buildWizardText([scored("Anna", -40)], "Standard", false, DATE);
    expect(text).toContain("🥇 Anna: -40 Punkte");
  });

  it("falls back to a plain label past rank 6", () => {
    const players = Array.from({ length: 7 }, (_, i) => scored(`P${i + 1}`, 70 - i * 10));
    const text = buildWizardText(players, "Standard", false, DATE);
    expect(text).toContain(" 7. P7: 10 Punkte");
  });
});

describe("Flip 7 share text", () => {
  it("renders the Flip 7 header and puts the target in the mode label", () => {
    const text = buildFlip7Text(
      [scored("Anna", 205), scored("Ben", 180)],
      "Standard",
      200,
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

  it("falls back to a plain label past rank 6", () => {
    const players = Array.from({ length: 7 }, (_, i) => scored(`P${i + 1}`, 70 - i * 10));
    const text = buildFlip7Text(players, "Standard", 200, DATE);
    expect(text).toContain(" 7. P7: 10 Punkte");
  });
});
