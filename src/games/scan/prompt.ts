import { SHEET_COLUMNS, SHEET_FIELDS } from "./sheet";

/**
 * What the photo reader is told. It transcribes, nothing more: totals,
 * the bonus and every check happen in the app (sheet.ts), so a misread
 * shows up as a red field instead of a quietly wrong score.
 */
export const SCAN_SYSTEM = `You transcribe a photo of a paper Kniffel (Yahtzee) score card into JSON.

The card: a header with the word "Würfelkarte" and a QR code, black squares in the four corners, and a grid. The left column holds the row labels; to its right are exactly ${SHEET_COLUMNS} player columns, numbered 1 to ${SHEET_COLUMNS} from left to right.
Rows from top to bottom:
- name: the "Name" row (the players' handwritten names)
- einser, zweier, dreier, vierer, fuenfer, sechser: six rows labelled with a die showing 1 to 6 pips
- dreierpasch ("3er-Pasch"), viererpasch ("4er-Pasch"), fullhouse ("Full House 25"), kleinestrasse ("Kl. Straße 30"), grossestrasse ("Gr. Straße 40"), kniffel ("Kniffel 50"), chance ("Chance")
- summe: the grey "Summe" row at the bottom

For every cell, copy what is handwritten there:
- an empty cell: ""
- a number: its digits, exactly as written ("9", "24", "100"). Do not add, correct or compute anything.
- struck out: "X". That is an X, a written 0, a scribble, and ANY single line: horizontal, slanted either way or vertical, short or across the whole box. A lone stroke is never unclear: it is "X".
  The one exception: in the einser row a short vertical stroke is the digit "1".
- a tick or check mark: "✓"
- if a number was crossed out and another written next to it, the new one
- the printed labels and values (25, 30, 40, 50) are not handwriting; never copy them

Columns with no name and no entries get name "" and "" in every cell. Always return ${SHEET_COLUMNS} columns, left to right.
If you cannot read a cell with confidence, give your best guess and add "<column number>:<row name>" (for example "2:vierer") to unclear.
The photo may be tilted, rotated or taken at an angle; use the corner squares and the labels to find the grid. The top-left corner square is hollow.
If the photo does not show this card, return is_sheet false and empty columns.`;

const cellNames = [...SHEET_FIELDS.map((f) => f.cell), "summe"];

/** Structured-output schema: the model can only answer in this shape. */
export const SCAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_sheet", "columns", "unclear"],
  properties: {
    is_sheet: { type: "boolean" },
    columns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "cells"],
        properties: {
          name: { type: "string" },
          cells: {
            type: "object",
            additionalProperties: false,
            required: cellNames,
            properties: Object.fromEntries(cellNames.map((c) => [c, { type: "string" }])),
          },
        },
      },
    },
    unclear: { type: "array", items: { type: "string" } },
  },
} as const;
