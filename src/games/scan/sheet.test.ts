import { describe, expect, it } from "vitest";

import {
  invalidCells,
  isValidCell,
  parseCell,
  playersFromRead,
  ranking,
  SHEET_FIELDS,
  sheetScore,
  toPoints,
  type ReadColumn,
} from "./sheet";

const field = (cell: string) => SHEET_FIELDS.find((f) => f.cell === cell)!;

const column = (name: string, cells: Partial<ReadColumn["cells"]>): ReadColumn => ({
  name,
  cells: {
    einser: "", zweier: "", dreier: "", vierer: "", fuenfer: "", sechser: "",
    dreierpasch: "", viererpasch: "", fullhouse: "", kleinestrasse: "",
    grossestrasse: "", kniffel: "", chance: "", summe: "",
    ...cells,
  },
});

describe("parseCell", () => {
  it("reads numbers, strikes and ticks", () => {
    expect(parseCell(field("dreier"), " 9 ")).toBe(9);
    expect(parseCell(field("dreier"), "")).toBeNull();
    expect(parseCell(field("dreier"), "X")).toBe("X");
    expect(parseCell(field("dreier"), "—")).toBe("X");
    expect(parseCell(field("dreier"), "0")).toBe("X");
    expect(parseCell(field("fullhouse"), "✓")).toBe(25);
    expect(parseCell(field("kniffel"), "✓")).toBe(50);
    expect(Number.isNaN(parseCell(field("chance"), "✓") as number)).toBe(true);
    expect(Number.isNaN(parseCell(field("chance"), "??") as number)).toBe(true);
  });
});

describe("isValidCell", () => {
  it("knows what each field can hold", () => {
    expect(isValidCell(field("vierer"), 12)).toBe(true);
    expect(isValidCell(field("vierer"), 13)).toBe(false);
    expect(isValidCell(field("vierer"), 24)).toBe(false);
    expect(isValidCell(field("fullhouse"), 25)).toBe(true);
    expect(isValidCell(field("fullhouse"), 26)).toBe(false);
    expect(isValidCell(field("kniffel"), 100)).toBe(true);
    expect(isValidCell(field("chance"), 31)).toBe(false);
    expect(isValidCell(field("chance"), "X")).toBe(true);
    expect(isValidCell(field("chance"), Number.NaN)).toBe(false);
  });
});

describe("a read sheet", () => {
  const read = {
    is_sheet: true,
    unclear: [],
    columns: [
      column("Anna", { einser: "3", zweier: "6", dreier: "9", vierer: "12", fuenfer: "15", sechser: "18", fullhouse: "✓", chance: "22", summe: "120" }),
      column("", {}),
      column("", { einser: "2", chance: "31" }),
      column("Ben", { kniffel: "50", grossestrasse: "X" }),
    ],
  };
  const players = playersFromRead(read);

  it("drops empty columns and names unnamed ones", () => {
    expect(players.map((p) => p.name)).toEqual(["Anna", "Spieler 3", "Ben"]);
  });

  it("scores with the bonus at 63", () => {
    // 63 upper + 35 bonus + 25 + 22
    expect(sheetScore(players[0])).toBe(145);
    expect(players[0].writtenSum).toBe(120);
  });

  it("keeps open fields at 0 and struck ones as X", () => {
    expect(toPoints(players[1]).Einser).toBe(2);
    expect(toPoints(players[1]).Zweier).toBe(0);
    expect(toPoints(players[2])["Große Straße"]).toBe("X");
    expect(toPoints(players[2]).Wunder).toBe(50);
  });

  it("flags impossible cells", () => {
    expect(invalidCells(players[1])).toEqual(["chance"]);
    expect(invalidCells(players[0])).toEqual([]);
  });

  it("ranks best first", () => {
    expect(ranking(players).map((r) => [r.player.name, r.place])).toEqual([
      ["Anna", 1],
      ["Ben", 2],
      ["Spieler 3", 3],
    ]);
  });
});
