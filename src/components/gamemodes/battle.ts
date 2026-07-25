import { GamemodeConfig } from "./gamemodes";
import { Player } from "../hooks/types";

export type BattleFieldStatus = "open" | "blocked" | "forced";

type FieldValue = number | "X" | undefined;

const asValue = (v: number | "X" | undefined): FieldValue =>
  v === 0 ? undefined : v;

const isResolved = (v: FieldValue): boolean =>
  typeof v === "number" || v === "X";

/**
 * Aggregate what the *other* players have done with a field.
 * - claimed: at least one other player scored a number in it (field is gone)
 * - crossed: at least one other player crossed it out (X) and nobody scored it
 */
function othersState(
  players: Player[],
  fieldKey: string,
  selfId: number,
): { claimed: boolean; crossed: boolean } {
  let claimed = false;
  let crossed = false;
  for (const player of players) {
    if (player.id === selfId) continue;
    const value = asValue(
      player.points[fieldKey as keyof typeof player.points],
    );
    if (typeof value === "number") claimed = true;
    else if (value === "X") crossed = true;
  }
  return { claimed, crossed };
}

/**
 * Cross-player hint for a single player's cell. Only open cells get an
 * overlay; a cell the player already resolved keeps its own styling.
 */
export function getBattleFieldStatus(
  players: Player[],
  fieldKey: string,
  selfId: number,
): BattleFieldStatus {
  const own = asValue(players.find((p) => p.id === selfId)?.points[
    fieldKey as keyof Player["points"]
  ]);
  if (isResolved(own)) return "open";

  const { claimed, crossed } = othersState(players, fieldKey, selfId);
  if (claimed) return "blocked";
  if (crossed) return "forced";
  return "open";
}

/**
 * A numeric entry counts double when, at the moment of entry, the field was
 * forced on this player: someone else crossed it out and nobody has claimed
 * it yet. Evaluate against the state *before* the entry is applied.
 */
export function isForcedSuccess(
  players: Player[],
  fieldKey: string,
  selfId: number,
): boolean {
  const { claimed, crossed } = othersState(players, fieldKey, selfId);
  return crossed && !claimed;
}

/**
 * Fields that are currently forced and still open for at least one player,
 * for the banner. A field stops being forced once someone claims it.
 */
export function getOpenForcedFields(
  players: Player[],
  config: GamemodeConfig,
): { key: string; label: string }[] {
  return config.fields.filter(({ key }) => {
    let crossed = false;
    let claimed = false;
    let someoneOpen = false;
    for (const player of players) {
      const value = asValue(player.points[key as keyof Player["points"]]);
      if (typeof value === "number") claimed = true;
      else if (value === "X") crossed = true;
      else someoneOpen = true;
    }
    return crossed && !claimed && someoneOpen;
  });
}

const numeric = (v: number | "X" | undefined): number =>
  typeof v === "number" ? v : 0;

/** Upper-section sum, doubling any doubled upper fields (counts for bonus). */
export function battleUpperSum(
  points: Record<string, number | "X">,
  doubled: Set<string>,
  config: GamemodeConfig,
): number {
  if (!config.bonus) return 0;
  return config.bonus.fields.reduce((acc, key) => {
    const value = numeric(points[key]);
    return acc + (doubled.has(key) ? value * 2 : value);
  }, 0);
}

/** Total Battle score: every numeric field, doubled where flagged, plus bonus. */
export function battleTotalScore(
  points: Record<string, number | "X">,
  doubled: Set<string>,
  config: GamemodeConfig,
): number {
  const total = config.fields.reduce((acc, { key }) => {
    const value = numeric(points[key]);
    return acc + (doubled.has(key) ? value * 2 : value);
  }, 0);

  let bonus = 0;
  if (config.bonus) {
    const upperSum = battleUpperSum(points, doubled, config);
    if (upperSum >= config.bonus.minSum) bonus = config.bonus.bonus;
  }
  return total + bonus;
}
