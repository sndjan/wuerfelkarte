import { gamemodes } from "@/games/yatzy/gamemodes";
import { battleTotalScore } from "@/games/yatzy/gamemodes/battle";
import type { Mission } from "@/games/yatzy/gamemodes/chaoswunder";
import { calculateScore } from "@/games/yatzy/scoring";
import type { YatzyMatch } from "@/games/yatzy/storage";
import type { Points } from "@/games/yatzy/types";
import {
  diceCountFor,
  extraWunderFields,
  fieldOptions,
  hasExtraWunder,
  scoreField,
  wunderFieldOf,
} from "./dice";
import { NORMAL_RULES, missionRules, type MissionRules } from "./missions";

/**
 * Kniffel online as pure functions over one JSON state. The server runs
 * them to decide every move (and rolls the dice); the board runs the same
 * ones to show what a tap would do.
 */

export type DiceMode = "digital" | "physical";

/** A filled cell: points, or crossed out. An open cell has no entry. */
export type Cell = number | "X";

export type OnlineSeat = {
  userId: string;
  name: string;
  points: Record<string, Cell>;
  /** Battle: fields that counted double. */
  doubled: string[];
  /** Turns taken; drives the Chaoswunder mission. */
  turns: number;
  /** Left the game (or was taken out): the column stays as it is. */
  left: boolean;
};

export type OnlineTurn = {
  /** Rolls made this turn; 0 before the first. */
  rolls: number;
  dice: number[];
  /** Dice that may not be rolled again this turn (mission rules). */
  locked: boolean[];
  /** The dice the last roll threw. */
  thrown: boolean[];
  /** The mission's extra roll has been used. */
  extraUsed: boolean;
};

export type LastEntry = {
  seat: number;
  field: string;
  value: Cell;
  doubled: boolean;
  extraWunder: boolean;
  dice?: number[];
};

export type OnlineState = {
  gamemode: string;
  diceMode: DiceMode;
  seats: OnlineSeat[];
  /** Index of the seat whose turn it is. */
  current: number;
  turn: OnlineTurn;
  /** Chaoswunder: the drawn missions. */
  missions: Mission[];
  /** Chaoswunder: a new mission every 1 or 2 rounds. */
  missionInterval: 1 | 2;
  lastEntry: LastEntry | null;
  startedAt: number;
  finishedAt: number | null;
  /**
   * When the host started the scoreboard. Until then nobody sees totals,
   * bonus progress or the ranking — only the cells.
   */
  revealedAt?: number | null;
};

export type Random = () => number;

export class MoveError extends Error {}

const fail = (message: string): never => {
  throw new MoveError(message);
};

const freshTurn = (gamemode: string): OnlineTurn => {
  const count = diceCountFor(gamemode);
  return {
    rolls: 0,
    dice: Array(count).fill(1),
    locked: Array(count).fill(false),
    thrown: Array(count).fill(false),
    extraUsed: false,
  };
};

export function newState({
  gamemode,
  diceMode,
  seats,
  missions = [],
  missionInterval = 2,
  now = Date.now(),
}: {
  gamemode: string;
  diceMode: DiceMode;
  seats: { userId: string; name: string }[];
  missions?: Mission[];
  missionInterval?: 1 | 2;
  now?: number;
}): OnlineState {
  if (!(gamemode in gamemodes)) fail("unknown gamemode");
  return {
    gamemode,
    diceMode,
    seats: seats.map((s) => ({ ...s, points: {}, doubled: [], turns: 0, left: false })),
    current: 0,
    turn: freshTurn(gamemode),
    missions: gamemode === "Chaoswunder" ? missions : [],
    missionInterval,
    lastEntry: null,
    startedAt: now,
    finishedAt: null,
    revealedAt: null,
  };
}

export const fieldKeys = (state: Pick<OnlineState, "gamemode">): string[] =>
  gamemodes[state.gamemode].fields.map((f) => f.key);

const isFilled = (cell: Cell | undefined): cell is Cell => cell !== undefined;

// Battle -----------------------------------------------------------------------

export type FieldStatus = "filled" | "open" | "blocked" | "forced";

/** A cell from one seat's point of view, with Battle's claims and crossings. */
export function fieldStatus(state: OnlineState, seatIndex: number, field: string): FieldStatus {
  const own = state.seats[seatIndex].points[field];
  if (isFilled(own)) return "filled";
  if (state.gamemode !== "Battle") return "open";
  let crossed = false;
  for (const [i, seat] of state.seats.entries()) {
    if (i === seatIndex) continue;
    const value = seat.points[field];
    if (typeof value === "number") return "blocked";
    if (value === "X") crossed = true;
  }
  return crossed ? "forced" : "open";
}

/**
 * The fields a seat may enter this turn: its open ones, minus Battle's
 * blocked fields; while a forced field is open, only the forced ones.
 */
export function candidateFields(state: OnlineState, seatIndex: number): string[] {
  const statuses = fieldKeys(state).map((key) => [key, fieldStatus(state, seatIndex, key)] as const);
  const forced = statuses.filter(([, s]) => s === "forced").map(([k]) => k);
  if (forced.length > 0) return forced;
  return statuses.filter(([, s]) => s === "open").map(([k]) => k);
}

// Missions -----------------------------------------------------------------------

/** The Chaoswunder mission for the seat on turn, or null. */
export function currentMission(state: OnlineState): Mission | null {
  if (state.missions.length === 0) return null;
  const seat = state.seats[state.current];
  const index = Math.min(Math.floor((seat?.turns ?? 0) / state.missionInterval), state.missions.length - 1);
  return state.missions[index] ?? null;
}

/** The dice rules of the current turn — enforced only with digital dice. */
export function currentRules(state: OnlineState): MissionRules {
  if (state.diceMode !== "digital") return NORMAL_RULES;
  return missionRules(currentMission(state) ?? undefined);
}

// Rolling ------------------------------------------------------------------------

export type RollKind = "normal" | "extra-six" | "all-dice";

/** Which kind of roll comes next, or null when the turn has none left. */
export function nextRoll(state: OnlineState): RollKind | null {
  if (state.finishedAt !== null || state.diceMode !== "digital") return null;
  const { turn } = state;
  const rules = currentRules(state);
  if (turn.rolls < rules.maxRolls) {
    if (turn.rolls > 0 && forcedKeeps(state).every(Boolean)) return null;
    return "normal";
  }
  if (turn.extraUsed || turn.rolls > rules.maxRolls) return null;
  if (rules.extraRollOnSix && turn.dice.some((d, i) => d === 6 && turn.thrown[i])) return "extra-six";
  if (rules.optionalAllDiceRoll) return "all-dice";
  return null;
}

/** Dice that must stay put on the next reroll. */
export function forcedKeeps(state: OnlineState): boolean[] {
  const { turn } = state;
  const rules = currentRules(state);
  return turn.dice.map(
    (d, i) => turn.locked[i] || (rules.noRerollFace !== undefined && turn.rolls > 0 && d === rules.noRerollFace),
  );
}

/** Whether a die may be toggled to keep on the next reroll. */
export function canKeep(state: OnlineState, index: number): boolean {
  const kind = nextRoll(state);
  if (kind === null || kind === "all-dice" || state.turn.rolls === 0) return false;
  const rules = currentRules(state);
  if (rules.allAtOnce) return false;
  if (forcedKeeps(state)[index]) return false;
  const face = state.turn.dice[index];
  if (rules.keepParity === "even" && face % 2 !== 0) return false;
  if (rules.keepParity === "odd" && face % 2 !== 1) return false;
  return true;
}

const rollDie = (random: Random) => 1 + Math.floor(random() * 6);

/**
 * Rolls for the seat on turn. `keep` marks the dice to keep; `preset` sets
 * dice before the first roll where a mission allows it.
 */
export function applyRoll(
  state: OnlineState,
  seatIndex: number,
  { keep, preset = [] }: { keep: readonly boolean[]; preset?: readonly number[] },
  random: Random = Math.random,
): OnlineState {
  if (state.finishedAt !== null) fail("finished");
  if (seatIndex !== state.current) fail("not your turn");
  const kind = nextRoll(state);
  if (kind === null) fail("no rolls left");
  const { turn } = state;
  const rules = currentRules(state);
  const count = turn.dice.length;
  if (keep.length !== count) fail("bad keep");

  let dice = [...turn.dice];
  let locked = [...turn.locked];
  let thrown: boolean[];

  if (turn.rolls === 0) {
    if (preset.length > 0) {
      if (!rules.presetTwo || preset.length > 2) fail("no preset");
      if (!preset.every((f) => Number.isInteger(f) && f >= 1 && f <= 6)) fail("bad preset");
    }
    thrown = dice.map((_, i) => i >= preset.length);
    dice = dice.map((_, i) => (i < preset.length ? preset[i] : rollDie(random)));
  } else {
    const forced = forcedKeeps(state);
    const kept = keep.map((k, i) => (kind === "all-dice" ? false : k || forced[i]));
    if (kind === "all-dice" && forced.some(Boolean)) fail("bad keep");
    for (let i = 0; i < count; i++) {
      if (!kept[i] || forced[i]) continue;
      if (!canKeep(state, i)) fail("bad keep");
    }
    if (kept.every(Boolean)) fail("nothing to roll");
    if (rules.lockAtLeastOne) {
      if (!kept.some((k, i) => k && !locked[i])) fail("keep one");
      locked = kept;
    }
    thrown = kept.map((k) => !k);
    dice = dice.map((d, i) => (kept[i] ? d : rollDie(random)));
  }

  return {
    ...state,
    turn: {
      rolls: turn.rolls + 1,
      dice,
      locked,
      thrown,
      extraUsed: turn.extraUsed || kind !== "normal",
    },
  };
}

// Entering a field -----------------------------------------------------------------

export type Entry = { value: Cell; doubled: boolean; extraWunder: boolean };

/** All dice alike, jokers included; returns the face or null. */
function wunderFace(dice: readonly number[], joker: boolean): number | null {
  const others = joker ? dice.filter((d) => d !== 6) : [...dice];
  if (others.length === 0) return 6;
  return others.every((d) => d === others[0]) ? others[0] : null;
}

/** The own Wunder box can take another Wunder (Wunder+, Battle). */
function extraWunderOpen(state: OnlineState, seatIndex: number): boolean {
  const wunder = wunderFieldOf(state.gamemode);
  if (!wunder || !hasExtraWunder(state.gamemode)) return false;
  const own = state.seats[seatIndex].points[wunder.key];
  const max = Math.max(...fieldOptions(state.gamemode, wunder.key));
  return typeof own === "number" && own >= wunder.base && own + wunder.base <= max;
}

const isForcedSuccess = (state: OnlineState, seatIndex: number, field: string, value: Cell) =>
  state.gamemode === "Battle" && typeof value === "number" && fieldStatus(state, seatIndex, field) === "forced";

/**
 * What entering `field` with the digital dice would write, or null when the
 * field is not allowed. An extra Wunder (Wunder+, Battle) adds to the Wunder
 * box and must go into a fitting field — or cross one out if none is left.
 */
export function digitalEntry(state: OnlineState, field: string): Entry | null {
  const seatIndex = state.current;
  if (state.finishedAt !== null || state.diceMode !== "digital" || state.turn.rolls === 0) return null;
  const candidates = candidateFields(state, seatIndex);
  if (!candidates.includes(field)) return null;
  const joker = currentRules(state).sixIsJoker ?? false;
  const dice = state.turn.dice;

  const face = extraWunderOpen(state, seatIndex) ? wunderFace(dice, joker) : null;
  if (face !== null) {
    const fitting = extraWunderFields(state.gamemode, face).filter((f) => candidates.includes(f));
    if (fitting.length > 0 && !fitting.includes(field)) return null;
    const points = fitting.length > 0 ? scoreField(field, dice, joker) : 0;
    const value: Cell = points > 0 ? points : "X";
    return { value, doubled: isForcedSuccess(state, seatIndex, field, value), extraWunder: true };
  }

  const points = scoreField(field, dice, joker);
  const value: Cell = points > 0 ? points : "X";
  return { value, doubled: isForcedSuccess(state, seatIndex, field, value), extraWunder: false };
}

/** Whether the seat on turn may add an extra Wunder by hand (real dice). */
export const canAddExtraWunder = (state: OnlineState) =>
  state.diceMode === "physical" && extraWunderOpen(state, state.current);

/** What entering a value by hand (real dice) would write, or null when not allowed. */
export function physicalEntry(
  state: OnlineState,
  field: string,
  value: Cell,
  extraWunder = false,
): Entry | null {
  const seatIndex = state.current;
  if (state.finishedAt !== null || state.diceMode !== "physical") return null;
  if (!candidateFields(state, seatIndex).includes(field)) return null;
  if (value !== "X" && !fieldOptions(state.gamemode, field).includes(value)) return null;
  if (extraWunder && !extraWunderOpen(state, seatIndex)) return null;
  return { value, doubled: isForcedSuccess(state, seatIndex, field, value), extraWunder };
}

/** The next seat, after `from`, that still has something to enter. */
function nextSeat(state: OnlineState, from: number): number | null {
  const n = state.seats.length;
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n;
    if (!state.seats[i].left && candidateFields(state, i).length > 0) return i;
  }
  return null;
}

/** Hands the turn on, or finishes the game when nobody has a field left. */
function advance(state: OnlineState, from: number, now: number): OnlineState {
  const next = nextSeat(state, from);
  return {
    ...state,
    current: next ?? state.current,
    turn: freshTurn(state.gamemode),
    finishedAt: next === null ? now : null,
  };
}

/** Writes an entry for the seat on turn and passes the turn on. */
export function applyEntry(
  state: OnlineState,
  seatIndex: number,
  field: string,
  entry: Entry | null,
  now: number = Date.now(),
): OnlineState {
  if (state.finishedAt !== null) fail("finished");
  if (seatIndex !== state.current) fail("not your turn");
  if (!entry) return fail("field not allowed");
  const seat = state.seats[seatIndex];
  const points = { ...seat.points, [field]: entry.value };
  if (entry.extraWunder) {
    const wunder = wunderFieldOf(state.gamemode)!;
    points[wunder.key] = (seat.points[wunder.key] as number) + wunder.base;
  }
  const seats = state.seats.map((s, i) =>
    i === seatIndex
      ? { ...s, points, doubled: entry.doubled ? [...s.doubled, field] : s.doubled, turns: s.turns + 1 }
      : s,
  );
  const lastEntry: LastEntry = {
    seat: seatIndex,
    field,
    value: entry.value,
    doubled: entry.doubled,
    extraWunder: entry.extraWunder,
    ...(state.diceMode === "digital" ? { dice: state.turn.dice } : {}),
  };
  return advance({ ...state, seats, lastEntry }, seatIndex, now);
}

/** A player leaves or is taken out; their column stays as it is. */
export function applyLeave(state: OnlineState, seatIndex: number, now: number = Date.now()): OnlineState {
  if (!state.seats[seatIndex] || state.seats[seatIndex].left) return state;
  const seats = state.seats.map((s, i) => (i === seatIndex ? { ...s, left: true } : s));
  const left = { ...state, seats };
  if (state.finishedAt !== null) return left;
  if (seats.every((s) => s.left)) return { ...left, finishedAt: now };
  if (seatIndex !== state.current) return left;
  return advance(left, seatIndex, now);
}

/** Whether the totals may be shown yet. */
export const scoresRevealed = (state: OnlineState) => state.revealedAt != null;

/** The host starts the scoreboard: totals and ranking become visible to everyone. */
export function applyReveal(state: OnlineState, now: number = Date.now()): OnlineState {
  return scoresRevealed(state) ? state : { ...state, revealedAt: now };
}

/** The host corrects a filled cell (real dice only, typos happen). */
export function applyCorrection(state: OnlineState, seatIndex: number, field: string, value: Cell): OnlineState {
  if (state.diceMode !== "physical") fail("no corrections");
  const seat = state.seats[seatIndex];
  if (!seat || !isFilled(seat.points[field])) fail("field not filled");
  if (value !== "X" && !fieldOptions(state.gamemode, field).includes(value)) fail("bad value");
  const seats = state.seats.map((s, i) =>
    i === seatIndex
      ? {
          ...s,
          points: { ...s.points, [field]: value },
          doubled: value === "X" ? s.doubled.filter((f) => f !== field) : s.doubled,
        }
      : s,
  );
  return { ...state, seats };
}

// Scores and the result --------------------------------------------------------------

/** A seat's points in the shape the Yatzy sheet stores: 0 = open. */
export const sheetPoints = (state: OnlineState, seat: OnlineSeat): Points =>
  Object.fromEntries(fieldKeys(state).map((key) => [key, seat.points[key] ?? 0])) as Points;

export function seatScore(state: OnlineState, seat: OnlineSeat): number {
  const config = gamemodes[state.gamemode];
  if (state.gamemode === "Battle") {
    return battleTotalScore(seat.points, new Set(seat.doubled), config);
  }
  return calculateScore(sheetPoints(state, seat), state.gamemode);
}

/** Upper-section sum (Battle's doubles included) and the bonus it reaches. */
export function upperSum(state: OnlineState, seat: OnlineSeat): { sum: number; min: number; bonus: number } | null {
  const bonus = gamemodes[state.gamemode].bonus;
  if (!bonus) return null;
  const sum = bonus.fields.reduce((acc, key) => {
    const v = seat.points[key];
    const n = typeof v === "number" ? v : 0;
    return acc + (seat.doubled.includes(key) ? n * 2 : n);
  }, 0);
  return { sum, min: bonus.minSum, bonus: bonus.bonus };
}

export type OnlineMatch = YatzyMatch & { online: true };

/** The finished game as an entry in the Yatzy history. */
export function toMatch(state: OnlineState, id: string): OnlineMatch {
  const finishedAt = state.finishedAt ?? Date.now();
  const names = state.seats.map((s) => s.name);
  return {
    id,
    gamemode: state.gamemode,
    timestamp: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - state.startedAt,
    online: true,
    players: state.seats.map((seat, i) => {
      // Statistics count by name, so two accounts with one name stay apart.
      const twin = names.findIndex((n) => n.toLowerCase() === seat.name.toLowerCase());
      return {
        name: twin === i ? seat.name : `${seat.name} (${i + 1})`,
        score: seatScore(state, seat),
        points: sheetPoints(state, seat),
        ...(seat.doubled.length > 0 ? { doubled: seat.doubled } : {}),
      };
    }),
  };
}
