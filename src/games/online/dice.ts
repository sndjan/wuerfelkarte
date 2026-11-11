import { gamemodes } from "@/games/yatzy/gamemodes";

/**
 * What a set of dice scores in each field of a Yatzy mode. Pure, shared by
 * the board (to show what a tap would enter) and the server (which decides).
 */

export type GamemodeKey = keyof typeof gamemodes;

/** How many dice a mode is played with. */
export const diceCountFor = (gamemode: string): number =>
  gamemode === "MiniWunder" ? 3 : gamemode === "SuperWunder" ? 6 : 5;

const UPPER: Record<string, number> = {
  Einser: 1,
  Zweier: 2,
  Dreier: 3,
  Vierer: 4,
  Fünfer: 5,
  Sechser: 6,
};

/** The face an upper-section field counts, or null for any other field. */
export const upperFace = (field: string): number | null => UPPER[field] ?? null;

const sum = (dice: readonly number[]) => dice.reduce((a, b) => a + b, 0);

/** How many of each face, sorted from most to fewest. */
const groupSizes = (dice: readonly number[]): number[] => {
  const counts = new Map<number, number>();
  for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
  return [...counts.values()].sort((a, b) => b - a);
};

const longestRun = (dice: readonly number[]): number => {
  const faces = new Set(dice);
  let best = 0;
  for (let start = 1; start <= 6; start++) {
    let length = 0;
    while (faces.has(start + length)) length++;
    best = Math.max(best, length);
  }
  return best;
};

/** Points for one field with these exact dice (no jokers). */
function plainScore(field: string, dice: readonly number[]): number {
  const face = upperFace(field);
  if (face !== null) return dice.filter((d) => d === face).length * face;
  const groups = groupSizes(dice);
  const most = groups[0] ?? 0;
  switch (field) {
    case "Zweierpasch":
      return most >= 2 ? sum(dice) : 0;
    case "Dreierpasch":
      return most >= 3 ? sum(dice) : 0;
    case "Viererpasch":
      return most >= 4 ? sum(dice) : 0;
    case "Fünferpasch":
      return most >= 5 ? sum(dice) : 0;
    case "Tiny House":
      // A pair and one other die — three of a kind is not a house.
      return groups.length === 2 && groups[0] === 2 ? 15 : 0;
    case "Full House":
      return groups.length === 2 && groups[0] === 3 ? 25 : 0;
    case "Dreifach-Paar":
      // Three pairs; four of a kind plus a pair (or six alike) are pairs too.
      return dice.length === 6 && groups.every((g) => g % 2 === 0) ? 30 : 0;
    case "Full Villa":
      return dice.length === 6 && groups.every((g) => g % 3 === 0) ? 45 : 0;
    case "Mini Straße":
      return longestRun(dice) >= 3 ? 20 : 0;
    case "Kleine Straße":
      return longestRun(dice) >= 4 ? 30 : 0;
    case "Große Straße":
      return longestRun(dice) >= 5 ? 40 : 0;
    case "Riesige Straße":
      return longestRun(dice) >= 6 ? 55 : 0;
    case "Mini Wunder":
      return most === dice.length ? 30 : 0;
    case "Wunder":
      return most === dice.length ? 50 : 0;
    case "Super Wunder":
      return most === dice.length ? 100 : 0;
    case "Chance":
      return sum(dice);
    default:
      return 0;
  }
}

/** Every way to read the sixes as any face, as distinct multisets. */
function jokerReadings(dice: readonly number[]): number[][] {
  const fixed = dice.filter((d) => d !== 6);
  const sixes = dice.length - fixed.length;
  const readings: number[][] = [];
  const pick = (from: number, left: number, chosen: number[]) => {
    if (left === 0) {
      readings.push([...fixed, ...chosen]);
      return;
    }
    for (let face = from; face <= 6; face++) pick(face, left - 1, [...chosen, face]);
  };
  pick(1, sixes, []);
  return readings;
}

/**
 * Points for one field. With `joker` (a Chaoswunder mission) every six may
 * stand for any face, and the best reading counts.
 */
export function scoreField(field: string, dice: readonly number[], joker = false): number {
  if (!joker || !dice.includes(6)) return plainScore(field, dice);
  return Math.max(...jokerReadings(dice).map((reading) => plainScore(field, reading)));
}

/** What every field of the mode would score with these dice. */
export function scoreAll(gamemode: string, dice: readonly number[], joker = false): Record<string, number> {
  const config = gamemodes[gamemode];
  return Object.fromEntries((config?.fields ?? []).map(({ key }) => [key, scoreField(key, dice, joker)]));
}

/** The field a mode's "all dice alike" roll goes into, and its base value. */
export function wunderFieldOf(gamemode: string): { key: string; base: number } | null {
  const config = gamemodes[gamemode];
  const field = config?.fields.find((f) => f.key === "Wunder" || f.key === "Mini Wunder" || f.key === "Super Wunder");
  if (!field) return null;
  const base = field.key === "Mini Wunder" ? 30 : field.key === "Super Wunder" ? 100 : 50;
  return { key: field.key, base };
}

/**
 * Whether the mode has the extra-Wunder rule (Wunder+, Battle): its Wunder
 * box takes more than one Wunder.
 */
export function hasExtraWunder(gamemode: string): boolean {
  const wunder = wunderFieldOf(gamemode);
  if (!wunder) return false;
  const options = gamemodes[gamemode].fields.find((f) => f.key === wunder.key)?.options ?? [];
  return options.includes(wunder.base * 2);
}

/** Fields an extra Wunder may go into: its number above, the Paschs and Chance. */
export function extraWunderFields(gamemode: string, face: number): string[] {
  const config = gamemodes[gamemode];
  const upper = Object.entries(UPPER).find(([, f]) => f === face)?.[0];
  const fitting = new Set([upper, "Dreierpasch", "Viererpasch", "Fünferpasch", "Zweierpasch", "Chance"]);
  return (config?.fields ?? []).map((f) => f.key).filter((key) => fitting.has(key));
}

/** The values a field can be given by hand, as on the paper sheet. */
export function fieldOptions(gamemode: string, field: string): number[] {
  const options = gamemodes[gamemode]?.fields.find((f) => f.key === field)?.options ?? [];
  return options.filter((o): o is number => typeof o === "number");
}
