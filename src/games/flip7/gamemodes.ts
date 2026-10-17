import { Flip7GamemodeKey } from "./types";

/**
 * What a mode changes for the scoresheet. Everything else the rulebooks differ
 * on happens on the table and never reaches the app.
 */
export type Flip7Rules = {
  /**
   * A round may end below zero. Voll Fies floors it at 0; Mega-Fies lets
   * Maluskarten be played against someone who already verzockt hat, so their
   * round ends on the malus alone.
   */
  allowsNegative: boolean;
  /** A Flip 7 may be traded for 15 points off another person's total. */
  allowsFlip7Penalty: boolean;
};

export type Flip7GamemodeConfig = {
  name: string;
  description: string;
  information: string[];
  rules: Flip7Rules;
};

const baseRules = [
  "• Jede Runde bekommt ihr reihum Karten offen ausgeteilt und entscheidet jedes Mal: Stopp oder noch eine.",
  "• Zahlenkarten zählen ihren Wert. Wer eine Zahl aufdeckt, die schon vor ihm liegt, hat sich verzockt und bekommt 0 Punkte für die Runde.",
  "• Bonuskarten (+2 bis +10) werden nach dem Verdoppeln addiert, die ×2-Karte verdoppelt nur die Zahlenkarten.",
  "• 7 verschiedene Zahlenkarten = Flip 7: Die Runde endet sofort für alle, es gibt 15 Extrapunkte.",
  "• Eine Runde endet außerdem, wenn niemand mehr im Spiel ist — alle sind ausgestiegen oder verzockt.",
  "• Aktionskarten: Freeze wirft eine aktive Person aus der Runde (Punkte zählen trotzdem), Flip Three gibt ihr 3 weitere Karten, Second Chance rettet einmalig vor dem Verzocken.",
];

/** Voll Fies keeps the Flip-7-Grundgerüst and swaps the Boni for Mali. */
const fiesRules = [
  "• Jede Runde bekommt ihr reihum Karten offen ausgeteilt und entscheidet jedes Mal: Stopp oder noch eine.",
  "• Zahlenkarten zählen ihren Wert. Wer eine Zahl aufdeckt, die schon vor ihm liegt, hat sich verzockt und bekommt 0 Punkte für die Runde.",
  "• 7 verschiedene Zahlenkarten = Flip 7: Die Runde endet sofort für alle, es gibt 15 Extrapunkte.",
  "• Maluskarten statt Bonuskarten: Die ÷2-Karte halbiert die Summe deiner Zahlenkarten (abgerundet), die Karten −2 bis −10 ziehen davon ab. Erst halbieren, dann abziehen.",
  "• Maluskarten sind keine Zahlenkarten: Sie zählen nicht für den Flip 7, und verzocken kannst du dich mit ihnen auch nicht.",
  "• Besondere Zahlenkarten: Die 0 macht deine ganze Auslage wertlos — außer bei einem Flip 7. Die Unlucky 7 lässt dich alle anderen Karten ablegen. Die Lucky 13 erlaubt dir eine zweite 13; bei der dritten hast du dich verzockt.",
  "• Aktionskarten: Just 1 More & Freeze gibt eine Karte und zwingt zum Aussteigen, Flip Four gibt 4 Karten einzeln, Switch tauscht 2 ausliegende Karten, Steal klaut eine, Burn lässt eine ablegen.",
  "• Eine Runde endet, wenn niemand mehr im Spiel ist oder jemandem ein Flip 7 gelingt.",
];

export const flip7Gamemodes: Record<Flip7GamemodeKey, Flip7GamemodeConfig> = {
  Standard: {
    name: "Standard",
    description: "Flip 7 nach den Grundregeln — Stopp oder noch eine.",
    information: [
      "Flip 7: Sammle Zahlenkarten, aber verzocke dich nicht.",
      ...baseRules,
    ],
    rules: { allowsNegative: false, allowsFlip7Penalty: false },
  },
  "Voll Fies": {
    name: "Voll Fies",
    description: "Der Nachfolger — Maluskarten und fiese Aktionskarten.",
    information: [
      "Flip 7 Voll Fies: Dieselbe Jagd nach sieben Zahlen, nur dass die Karten der anderen jetzt gegen dich arbeiten.",
      ...fiesRules,
      "• Unter 0 Punkte geht es in einer Runde nicht: Mehr als deine Zahlenkarten können die Mali dir nicht nehmen.",
    ],
    rules: { allowsNegative: false, allowsFlip7Penalty: false },
  },
  "Mega Fies": {
    name: "Mega-Fies",
    description: "Voll Fies mit Minuspunkten und geschenktem Flip-7-Bonus.",
    information: [
      "Flip 7 Mega-Fies: Voll Fies mit allen Zusatzregeln — hier tut es richtig weh.",
      ...fiesRules,
      "• Maluskarten dürfen auch gegen Personen gespielt werden, die sich verzockt haben. Eine Runde kann dadurch im Minus enden und geht von den Gesamtpunkten ab.",
      "• Bei einem Flip 7 kannst du auf die 15 Extrapunkte verzichten und stattdessen einer anderen Person 15 Punkte abziehen.",
      "• Wird in der ersten Runde Switch, Steal oder Burn aufgedeckt, während noch keine Karten ausliegen, kommt die Karte einfach auf den Ablagestapel.",
    ],
    rules: { allowsNegative: true, allowsFlip7Penalty: true },
  },
};

export const FLIP7_GAMEMODE_KEYS = Object.keys(
  flip7Gamemodes,
) as Flip7GamemodeKey[];

/** The scoresheet-relevant differences of a mode, in one place. */
export const flip7Rules = (gamemode: Flip7GamemodeKey): Flip7Rules =>
  (flip7Gamemodes[gamemode] ?? flip7Gamemodes.Standard).rules;

export const gamemodeSlug = (key: Flip7GamemodeKey) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

export const gamemodeFromSlug = (slug: string): Flip7GamemodeKey =>
  FLIP7_GAMEMODE_KEYS.find(
    (key) =>
      gamemodeSlug(key) === slug.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
  ) ?? "Standard";

/** Mode rules plus the target the group agreed on for this particular game. */
export function gamemodeInformation(
  gamemode: Flip7GamemodeKey,
  targetScore: number,
): string[] {
  return [
    ...flip7Gamemodes[gamemode].information,
    `• Die Partie endet, sobald am Rundenende jemand ${targetScore} Punkte erreicht. Wer dann die meisten Punkte hat, gewinnt; bei Gleichstand an der Spitze entscheidet eine weitere Runde.`,
  ];
}
