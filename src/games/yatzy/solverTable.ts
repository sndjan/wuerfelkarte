import { SOLVER_TABLE_PATH, solverFromTable, type Solver } from "./solver";

let pending: Promise<Solver> | null = null;

/** Fetches the precomputed table once; later calls share the same solver. */
export function loadSolver(): Promise<Solver> {
  if (!pending) {
    const request = fetch(SOLVER_TABLE_PATH)
      .then((response) => {
        if (!response.ok) throw new Error(`Solver table: HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => solverFromTable(data));
    // Let the next call retry after a failed download.
    request.catch(() => {
      if (pending === request) pending = null;
    });
    pending = request;
  }
  return pending;
}
