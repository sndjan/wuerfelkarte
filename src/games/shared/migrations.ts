import { APP_NAMESPACE, readJSON, writeJSON } from "./storage";
import { MatchPlayer, StoredMatch } from "./types";

/**
 * One-time migration of the localStorage keys the app used before the games
 * were split into namespaces.
 *
 * Rules this follows, deliberately:
 * - A new key is only written when it does not exist yet, so a migration can
 *   never overwrite data the new code already produced.
 * - Old keys are **kept**. Rolling the deployment back must not strand anyone's
 *   history, and the few stale kilobytes cost nothing.
 * - Every key is migrated independently: one malformed payload must not stop
 *   the others from coming across.
 */

export const SCHEMA_KEY = `${APP_NAMESPACE}:schema`;
export const CURRENT_SCHEMA = 1;

export const ROSTER_KEY = `${APP_NAMESPACE}:roster`;
export const THEME_ACTIVE_KEY = `${APP_NAMESPACE}:themeActive`;

const LEGACY = {
  roster: "kniffel:roster",
  themeActive: "kniffel:isThemeActive",
  yatzyPlayers: "kniffel:player-names",
  yatzyMatches: "lastMatches",
  chaosSettings: "chaoswunderSettings",
  wizardMatches: "wizard:lastMatches",
  flip7Matches: "flip7:lastMatches",
} as const;

const hasKey = (key: string): boolean => {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
};

/** Copies `from` to `to` verbatim, if there is something to copy and nothing to lose. */
const copyKey = (from: string, to: string): void => {
  try {
    if (hasKey(to) || !hasKey(from)) return;
    const raw = localStorage.getItem(from);
    if (raw !== null) localStorage.setItem(to, raw);
  } catch {
    // Ignore — this key simply does not migrate.
  }
};

/** Runs one migration step; a failure in it must not abort the rest. */
const step = (migrate: () => void): void => {
  try {
    migrate();
  } catch {
    // Ignore — see the module comment.
  }
};

/**
 * The pre-namespace Yatzy history stored whole player objects, point sheet
 * included, and had no match id. Reduce it to the shared match shape.
 */
type LegacyYatzyMatch = {
  players?: Array<{ name?: string; emoji?: string; score?: number }>;
  gamemode?: string;
  timestamp?: string;
  durationMs?: number;
};

const migrateYatzyMatches = (): void => {
  const legacy = readJSON<LegacyYatzyMatch[] | null>(LEGACY.yatzyMatches, null);
  if (!Array.isArray(legacy)) return;

  const migrated: StoredMatch<MatchPlayer>[] = legacy
    .filter((match) => Array.isArray(match?.players))
    .map((match) => ({
      id: crypto.randomUUID(),
      players: (match.players ?? []).map((player) => ({
        name: typeof player?.name === "string" ? player.name : "?",
        // `emoji: undefined` would survive JSON.stringify as a missing key anyway.
        ...(player?.emoji ? { emoji: player.emoji } : {}),
        score: typeof player?.score === "number" ? player.score : 0,
      })),
      gamemode: typeof match.gamemode === "string" ? match.gamemode : "Wunder",
      timestamp:
        typeof match.timestamp === "string"
          ? match.timestamp
          : new Date(0).toISOString(),
      ...(typeof match.durationMs === "number"
        ? { durationMs: match.durationMs }
        : {}),
    }));

  writeJSON("yatzy:matches", migrated);
};

/**
 * Wizard pushed its matches instead of upserting them, so old entries have no
 * id. Everything else about the shape is already right.
 */
const migrateWizardMatches = (): void => {
  const legacy = readJSON<Array<Record<string, unknown>> | null>(
    LEGACY.wizardMatches,
    null,
  );
  if (!Array.isArray(legacy)) return;

  writeJSON(
    "wizard:matches",
    legacy.map((match) => ({
      ...match,
      id: typeof match.id === "string" ? match.id : crypto.randomUUID(),
    })),
  );
};

/** Chaoswunder's toggles become part of Yatzy's settings blob. */
const migrateChaosSettings = (): void => {
  const legacy = readJSON<Record<string, unknown> | null>(
    LEGACY.chaosSettings,
    null,
  );
  if (legacy === null || typeof legacy !== "object") return;

  writeJSON("yatzy:settings", {
    ...readJSON<Record<string, unknown>>("yatzy:settings", {}),
    ...legacy,
  });
};

/**
 * Brings data written by the pre-refactor app onto the current keys. Safe to
 * call on every boot: it returns immediately once the schema marker is set.
 */
export function migrateLegacyStorage(): void {
  if (typeof window === "undefined") return;

  try {
    if (localStorage.getItem(SCHEMA_KEY) === String(CURRENT_SCHEMA)) return;
  } catch {
    // No storage at all — nothing to migrate.
    return;
  }

  // Verbatim moves: only the key name changed.
  step(() => copyKey(LEGACY.roster, ROSTER_KEY));
  step(() => copyKey(LEGACY.themeActive, THEME_ACTIVE_KEY));
  step(() => copyKey(LEGACY.yatzyPlayers, "yatzy:players"));
  step(() => copyKey(LEGACY.flip7Matches, "flip7:matches"));

  // Reshaped moves.
  step(() => {
    if (!hasKey("yatzy:matches")) migrateYatzyMatches();
  });
  step(() => {
    if (!hasKey("wizard:matches")) migrateWizardMatches();
  });
  step(() => {
    if (hasKey(LEGACY.chaosSettings)) migrateChaosSettings();
  });

  try {
    localStorage.setItem(SCHEMA_KEY, String(CURRENT_SCHEMA));
  } catch {
    // Without the marker the migration simply runs again next time, which is
    // harmless: every step is guarded against overwriting.
  }
}
