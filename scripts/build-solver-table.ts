/**
 * Precomputes the solver's state table for the championship rules and writes
 * it to public/, where the app loads it with loadSolver. Rerun after changing
 * the solver or its rules: `npm run build:solver-table`. The solver tests
 * fail while the shipped table is stale.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { createSolver, SOLVER_TABLE_PATH } from "../src/games/yatzy/solver.ts";

const started = Date.now();
const solver = createSolver();
const data = new Uint8Array(solver.serialize());
const file = `public${SOLVER_TABLE_PATH}`;
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, data);

const expected = solver.expectedScore({ filled: [], upperSum: 0 }).toFixed(4);
console.log(
  `Wrote ${file}: ${(data.byteLength / 1024 / 1024).toFixed(2)} MB, ` +
    `empty card ${expected}, ${((Date.now() - started) / 1000).toFixed(1)} s`,
);
