import type { Mission } from "@/games/yatzy/gamemodes/chaoswunder";

/**
 * A Chaoswunder mission as rules the online game can enforce. The missions
 * themselves are prose written for a table with real dice; this reads them.
 */
export type MissionRules = {
  /** Rolls a turn has without any extra. */
  maxRolls: number;
  /** Dice showing this face stay where they are after every roll. */
  noRerollFace?: number;
  /** Every reroll keeps at least one more die, and kept dice stay kept. */
  lockAtLeastOne?: boolean;
  /** No die may be kept: every roll throws all of them. */
  allAtOnce?: boolean;
  /** Only dice of this parity may be kept. */
  keepParity?: "even" | "odd";
  /** One more roll when the last throw showed a six. */
  extraRollOnSix?: boolean;
  /** Before the first roll, two dice may be set to any face. */
  presetTwo?: boolean;
  /** One more roll after the last, throwing all dice. */
  optionalAllDiceRoll?: boolean;
  /** Sixes stand for any face when the dice are scored. */
  sixIsJoker?: boolean;
};

export const NORMAL_RULES: MissionRules = { maxRolls: 3 };

const FACES: Record<string, number> = {
  Einsen: 1,
  Zweien: 2,
  Dreien: 3,
  Vieren: 4,
  Fünfen: 5,
  Sechsen: 6,
};

export function missionRules(mission: Mission | undefined): MissionRules {
  if (!mission) return NORMAL_RULES;
  const maxRolls = Number(mission.diceRule.match(/(\d+)/)?.[1] ?? 3);
  const text = mission.restriction;
  const rules: MissionRules = { maxRolls };

  const face = text.match(/^(Einsen|Zweien|Dreien|Vieren|Fünfen|Sechsen) dürfen nicht erneut/);
  if (face) rules.noRerollFace = FACES[face[1]];
  if (text.startsWith("Mindestens ein Würfel muss pro Wurf abgelegt werden")) rules.lockAtLeastOne = true;
  if (text.startsWith("Alle Würfel müssen gleichzeitig")) rules.allAtOnce = true;
  if (text.includes("nur gerade Zahlen")) rules.keepParity = "even";
  if (text.includes("nur ungerade Zahlen")) rules.keepParity = "odd";
  if (text.includes("zusätzlicher Wurf bei mindestens einer 6")) rules.extraRollOnSix = true;
  if (text.includes("zwei Würfel mit beliebigen Augenzahlen")) rules.presetTwo = true;
  if (text.includes("freiwilliger vierter Wurf")) rules.optionalAllDiceRoll = true;
  if (text.includes("6 zählt als Joker")) rules.sixIsJoker = true;
  return rules;
}
