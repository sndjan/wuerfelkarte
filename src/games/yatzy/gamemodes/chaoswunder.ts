export type Mission = {
  diceRule: string;
  restriction: string;
  difficulty: 1 | 2 | 3; // 1=good, 2=neutral, 3=hard
};

export const missions: Mission[] = [
  // Max. 3 Würfe, aber bestimmte Augenzahlen dürfen nicht erneut gewürfelt werden
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Einsen dürfen nicht erneut gewürfelt werden.",
    difficulty: 2,
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Zweien dürfen nicht erneut gewürfelt werden.",
    difficulty: 2,
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Dreien dürfen nicht erneut gewürfelt werden.",
    difficulty: 2,
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Vieren dürfen nicht erneut gewürfelt werden.",
    difficulty: 2,
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Fünfen dürfen nicht erneut gewürfelt werden.",
    difficulty: 2,
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Sechsen dürfen nicht erneut gewürfelt werden.",
    difficulty: 2,
  },

  // Mindestens ein Würfel muss pro Wurf abgelegt werden
  {
    diceRule: "Maximal 3 Würfe.",
    restriction:
      "Mindestens ein Würfel muss pro Wurf abgelegt werden, diese dürfen nicht erneut gewürfelt werden.",
    difficulty: 2,
  },
  {
    diceRule: "Maximal 4 Würfe.",
    restriction:
      "Mindestens ein Würfel muss pro Wurf abgelegt werden, diese dürfen nicht erneut gewürfelt werden.",
    difficulty: 1,
  },
  {
    diceRule: "Maximal 5 Würfe.",
    restriction:
      "Mindestens ein Würfel muss pro Wurf abgelegt werden, diese dürfen nicht erneut gewürfelt werden.",
    difficulty: 1,
  },

  // Alle Würfel müssen gleichzeitig geworfen werden
  {
    diceRule: "Maximal 2 Würfe.",
    restriction: "Alle Würfel müssen gleichzeitig geworfen werden. ",
    difficulty: 3,
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Alle Würfel müssen gleichzeitig geworfen werden. ",
    difficulty: 3,
  },
  {
    diceRule: "Maximal 4 Würfe.",
    restriction: "Alle Würfel müssen gleichzeitig geworfen werden. ",
    difficulty: 3,
  },

  // Es dürfen nur bestimmte Augenzahlen abgelegt werden
  {
    diceRule: "Maximal 3 Würfe.",
    restriction:
      "Es dürfen nur gerade Zahlen (2,4,6) abgelegt werden. Jedoch dürfen alle Würfel zum Eintragen genutzt werden.",
    difficulty: 3,
  },
  {
    diceRule: "Maximal 4 Würfe.",
    restriction:
      "Es dürfen nur gerade Zahlen (2,4,6) abgelegt werden. Jedoch dürfen alle Würfel zum Eintragen genutzt werden.",
    difficulty: 3,
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction:
      "Es dürfen nur ungerade Zahlen (1,3,5) abgelegt werden. Jedoch dürfen alle Würfel zum Eintragen genutzt werden.",
    difficulty: 3,
  },
  {
    diceRule: "Maximal 4 Würfe.",
    restriction:
      "Es dürfen nur ungerade Zahlen (1,3,5) abgelegt werden. Jedoch dürfen alle Würfel zum Eintragen genutzt werden.",
    difficulty: 3,
  },

  // Normale Würfelregeln
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Keine zusätzlichen Einschränkungen.",
    difficulty: 2,
  },
  {
    diceRule: "Maximal 4 Würfe.",
    restriction: "Keine zusätzlichen Einschränkungen.",
    difficulty: 1,
  },
  {
    diceRule: "Maximal 5 Würfe.",
    restriction: "Keine zusätzlichen Einschränkungen.",
    difficulty: 1,
  },

  // Spezielle Würfelregeln
  {
    diceRule: "Maximal 3 Würfe.",
    restriction:
      "Ein zusätzlicher Wurf bei mindestens einer 6 im letzten Wurf.",
    difficulty: 1,
  },
  {
    diceRule: "Maximal 2 Würfe.",
    restriction:
      "Bevor gewürfelt wird dürfen zwei Würfel mit beliebigen Augenzahlen abgelegt werden.",
    difficulty: 2,
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction:
      "Ein freiwilliger vierter Wurf darf gemacht werden, jedoch müssen alle Würfel neu geworfen werden.",
    difficulty: 1,
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction:
      "Die Augenzahl 6 zählt als Joker und kann für jede Augenzahl verwendet werden.",
    difficulty: 1,
  },
];

/** Total Yatzy fields; missions rotate every `interval` rounds across them. */
const TOTAL_ROUNDS = 14;

export const missionCountFor = (interval: number): number =>
  TOTAL_ROUNDS / interval;

/**
 * In balanced mode a run gets a fixed difficulty mix instead of a free draw,
 * so nobody ends up with an evening of nothing but hard missions.
 */
const BALANCED_MIX: Record<number, { hard: number; neutral: number; good: number }> =
  {
    7: { hard: 1, neutral: 3, good: 3 },
    14: { hard: 2, neutral: 6, good: 6 },
  };

type Shuffle = <T>(items: T[]) => T[];

const defaultShuffle: Shuffle = (items) =>
  [...items].sort(() => Math.random() - 0.5);

/**
 * The missions for one Chaoswunder game. `shuffle` is injectable so the
 * selection can be tested without randomness.
 */
export function selectMissions(
  interval: number,
  balanced: boolean,
  shuffle: Shuffle = defaultShuffle,
): Mission[] {
  const count = missionCountFor(interval);

  if (!balanced) return shuffle(missions).slice(0, count);

  const ofDifficulty = (difficulty: 1 | 2 | 3) =>
    shuffle(missions.filter((m) => m.difficulty === difficulty));

  const mix = BALANCED_MIX[count] ?? BALANCED_MIX[14];
  return shuffle([
    ...ofDifficulty(3).slice(0, mix.hard),
    ...ofDifficulty(2).slice(0, mix.neutral),
    ...ofDifficulty(1).slice(0, mix.good),
  ]);
}
