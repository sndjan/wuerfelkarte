import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A tiny in-memory stand-in for the parts of supabase-js the online server
 * uses, so its flows can be tested without a database. Only for tests.
 */

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

const UNIQUE: Record<string, (row: Row) => string | null> = {
  online_games: (r) => `id:${r.id}`,
  online_game_players: (r) => `pk:${r.game_id}:${r.user_id}`,
};
const PARTIAL_UNIQUE: Record<string, (row: Row) => string | null> = {
  online_game_players: (r) => (r.active ? `active:${r.user_id}` : null),
};

const DEFAULTS: Record<string, () => Row> = {
  online_games: () => ({
    id: crypto.randomUUID(),
    status: "lobby",
    settings: {},
    state: null,
    version: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  online_game_players: () => ({
    status: "invited",
    active: false,
    invited_at: new Date(Date.now() + Math.random()).toISOString(),
    updated_at: new Date().toISOString(),
  }),
};

const parseList = (value: string) => value.replace(/^\(|\)$/g, "").split(",").filter(Boolean);

class Query {
  private filters: Filter[] = [];
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row[] = [];
  private singleMode: "one" | "maybe" | null = null;
  private ignoreDuplicates = false;

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  /** Reading, or (after a write) returning the written rows — which this fake always does. */
  select() {
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[], options?: { ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.ignoreDuplicates = Boolean(options?.ignoreDuplicates);
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.payload = [patch];
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((r) => r[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((r) => r[column] !== value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[column]));
    return this;
  }
  not(column: string, operator: string, value: string) {
    if (operator !== "in") throw new Error("fake: only not in");
    const list = parseList(value);
    this.filters.push((r) => !list.includes(String(r[column])));
    return this;
  }
  or(expression: string) {
    const parts = expression.split(",").map((p) => {
      const [column, op, ...rest] = p.split(".");
      if (op !== "eq") throw new Error("fake: only eq in or");
      return [column, rest.join(".")] as const;
    });
    this.filters.push((r) => parts.some(([c, v]) => String(r[c]) === v));
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }
  single() {
    this.singleMode = "one";
    return this;
  }

  then<T>(resolve: (value: { data: unknown; error: { code: string; message: string } | null }) => T) {
    return Promise.resolve(resolve(this.run()));
  }

  private run(): { data: unknown; error: { code: string; message: string } | null } {
    const rows = this.db.tables[this.table] ?? (this.db.tables[this.table] = []);
    const matches = () => rows.filter((r) => this.filters.every((f) => f(r)));
    const snapshot = this.db.snapshot();
    try {
      let result: Row[];
      switch (this.op) {
        case "select":
          result = matches();
          break;
        case "insert":
        case "upsert":
          result = [];
          for (const input of this.payload) {
            const row = { ...(DEFAULTS[this.table]?.() ?? {}), ...structuredClone(input) };
            const key = UNIQUE[this.table]?.(row);
            const existing = key ? rows.find((r) => UNIQUE[this.table]!(r) === key) : undefined;
            if (existing) {
              if (this.op === "upsert" && this.ignoreDuplicates) continue;
              throw { code: "23505", message: "duplicate" };
            }
            rows.push(row);
            result.push(row);
          }
          break;
        case "update":
          result = matches();
          for (const row of result) Object.assign(row, structuredClone(this.payload[0]));
          break;
        case "delete":
          result = matches();
          this.db.tables[this.table] = rows.filter((r) => !result.includes(r));
          if (this.table === "online_games") {
            const ids = result.map((r) => r.id);
            this.db.tables.online_game_players = (this.db.tables.online_game_players ?? []).filter(
              (p) => !ids.includes(p.game_id),
            );
          }
          break;
      }
      this.db.checkPartialUnique(this.table);
      const data = structuredClone(result);
      if (this.singleMode === "maybe") return { data: data[0] ?? null, error: null };
      if (this.singleMode === "one") {
        return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: "PGRST116", message: "not one" } };
      }
      return { data, error: null };
    } catch (error) {
      this.db.restore(snapshot);
      return { data: null, error: error as { code: string; message: string } };
    }
  }
}

export class FakeDb {
  tables: Record<string, Row[]> = {};

  snapshot() {
    return structuredClone(this.tables);
  }
  restore(snapshot: Record<string, Row[]>) {
    this.tables = snapshot;
  }
  checkPartialUnique(table: string) {
    const key = PARTIAL_UNIQUE[table];
    if (!key) return;
    const seen = new Set<string>();
    for (const row of this.tables[table] ?? []) {
      const k = key(row);
      if (!k) continue;
      if (seen.has(k)) throw { code: "23505", message: "duplicate active" };
      seen.add(k);
    }
  }

  client(): SupabaseClient {
    return {
      from: (table: string) => {
        return new Query(this, table);
      },
    } as unknown as SupabaseClient;
  }
}
