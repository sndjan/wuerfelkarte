import { calculateScore } from "@/games/yatzy/scoring";
import type { Points } from "@/games/yatzy/types";

/**
 * The printed Kniffelblock (scripts/kniffelblock/build.mjs, layout "a6"):
 * one game, four player columns, the classic fields top to bottom. Pure
 * functions only: what the photo reader returns, how a cell is checked and
 * how a column becomes a Yatzy sheet.
 */

export const SHEET_COLUMNS = 4;

/** The sheet's rows in print order, keyed by the reader's JSON names. */
export const SHEET_FIELDS = [
  { cell: "einser", key: "Einser", label: "Einser", face: 1 },
  { cell: "zweier", key: "Zweier", label: "Zweier", face: 2 },
  { cell: "dreier", key: "Dreier", label: "Dreier", face: 3 },
  { cell: "vierer", key: "Vierer", label: "Vierer", face: 4 },
  { cell: "fuenfer", key: "Fünfer", label: "Fünfer", face: 5 },
  { cell: "sechser", key: "Sechser", label: "Sechser", face: 6 },
  { cell: "dreierpasch", key: "Dreierpasch", label: "3er-Pasch" },
  { cell: "viererpasch", key: "Viererpasch", label: "4er-Pasch" },
  { cell: "fullhouse", key: "Full House", label: "Full House", fixed: 25 },
  { cell: "kleinestrasse", key: "Kleine Straße", label: "Kl. Straße", fixed: 30 },
  { cell: "grossestrasse", key: "Große Straße", label: "Gr. Straße", fixed: 40 },
  { cell: "kniffel", key: "Wunder", label: "Kniffel", fixed: 50 },
  { cell: "chance", key: "Chance", label: "Chance" },
] as const satisfies readonly {
  cell: string;
  key: keyof Points;
  label: string;
  face?: number;
  fixed?: number;
}[];

export type SheetField = (typeof SHEET_FIELDS)[number];
export type CellName = SheetField["cell"];

/** What the reader returns for one column: the text of every cell, as written. */
export type ReadColumn = {
  name: string;
  cells: Record<CellName | "summe", string>;
};

export type ReadSheet = {
  is_sheet: boolean;
  columns: ReadColumn[];
  /** "<column 1–4>:<cell>" for cells the reader was not sure about. */
  unclear: string[];
};

/** A cell after reading: empty, struck (0 points) or a number. */
export type CellValue = number | "X" | null;

const TICK = /^[✓✔☑√vV✗]$/;

/**
 * Turns the text of one cell into a value. A tick on a fixed field means its
 * points; a dash, slash or 0 means struck.
 */
export function parseCell(field: SheetField, raw: string): CellValue {
  const text = raw.trim().replace(/\s+/g, "");
  if (text === "") return null;
  if (/^(x|-|–|—|\/|0|o)$/i.test(text)) return "X";
  if ("fixed" in field && TICK.test(text)) return field.fixed;
  const digits = text.replace(/[^0-9]/g, "");
  if (digits === "" || digits.length > 3) return Number.NaN;
  const n = Number(digits);
  return n === 0 ? "X" : n;
}

/** Whether a value can stand in this field on a classic card. */
export function isValidCell(field: SheetField, value: CellValue): boolean {
  if (value === null || value === "X") return true;
  if (!Number.isInteger(value) || value <= 0) return false;
  if ("face" in field) return value % field.face === 0 && value <= field.face * 5;
  // Kniffel: extra Kniffels on the same field are allowed as 100, 150, … like the app's Wunder mode.
  if (field.cell === "kniffel") return value % 50 === 0 && value <= 500;
  if ("fixed" in field) return value === field.fixed;
  // 3er-/4er-Pasch, Chance: the sum of five dice.
  return value >= 5 && value <= 30;
}

/** A column as the review screen edits it. */
export type SheetPlayer = {
  name: string;
  values: Record<CellName, CellValue>;
  /** The sum written on paper, if any — only to point out a difference. */
  writtenSum: number | null;
};

/** The reader's columns that hold anything, as players. */
export function playersFromRead(read: ReadSheet): SheetPlayer[] {
  return read.columns.slice(0, SHEET_COLUMNS).flatMap((column, i) => {
    const values = Object.fromEntries(
      SHEET_FIELDS.map((f) => [f.cell, parseCell(f, column.cells?.[f.cell] ?? "")]),
    ) as Record<CellName, CellValue>;
    const name = (column.name ?? "").trim().slice(0, 24);
    const empty = Object.values(values).every((v) => v === null);
    if (empty && !name) return [];
    const sum = Number((column.cells?.summe ?? "").replace(/[^0-9]/g, ""));
    return [{ name: name || `Spieler ${i + 1}`, values, writtenSum: sum > 0 ? sum : null }];
  });
}

/** The column as a Yatzy sheet in the app's own shape: 0 is an open field, "X" a struck one. */
export function toPoints(player: SheetPlayer): Points {
  return Object.fromEntries(
    SHEET_FIELDS.map((f) => {
      const v = player.values[f.cell];
      return [f.key, v === null || Number.isNaN(v) ? 0 : v];
    }),
  ) as Points;
}

export const sheetScore = (player: SheetPlayer): number => calculateScore(toPoints(player), "Wunder");

/** The upper section's sum and whether it reached the 35 bonus. */
export function upperSum(player: SheetPlayer): { sum: number; bonus: boolean } {
  const sum = SHEET_FIELDS.filter((f) => "face" in f).reduce((acc, f) => {
    const v = player.values[f.cell];
    return acc + (typeof v === "number" && !Number.isNaN(v) ? v : 0);
  }, 0);
  return { sum, bonus: sum >= 63 };
}

/** Every cell that blocks saving: not readable or not possible in its field. */
export function invalidCells(player: SheetPlayer): CellName[] {
  return SHEET_FIELDS.filter((f) => !isValidCell(f, player.values[f.cell])).map((f) => f.cell);
}

/** Players with their totals, best first; ties share a place. */
export function ranking(players: SheetPlayer[]): { player: SheetPlayer; index: number; score: number; place: number }[] {
  const scored = players
    .map((player, index) => ({ player, index, score: sheetScore(player) }))
    .sort((a, b) => b.score - a.score);
  return scored.map((entry) => ({ ...entry, place: scored.findIndex((e) => e.score === entry.score) + 1 }));
}

/** How a value shows in the review's input. */
export const formatCell = (value: CellValue): string =>
  value === null ? "" : value === "X" ? "X" : Number.isNaN(value) ? "?" : String(value);
