import { CaboGamemodeKey } from "./types";

export type CaboGamemodeConfig = {
  name: string;
  description: string;
  information: string[];
};

const baseRules = [
  "• Jeder bekommt 4 Karten verdeckt ausgeteilt und schaut sich davon einmalig 2 geheim an.",
  "• Reihum zieht man entweder die offene Karte vom Ablagestapel oder die oberste vom Nachziehstapel — anschließend wird abgeworfen, getauscht oder eine Kartenaktion genutzt.",
  "• 7 und 8 (Peek): eigene Karte ansehen. 9 und 10 (Spy): Karte eines Mitspielers ansehen. 11 und 12 (Swap): Karten tauschen, ohne hinzuschauen.",
  "• Wer denkt, die niedrigste Kartensumme zu haben, sagt \"Cabo\" — alle anderen ziehen noch einmal, dann wird aufgedeckt.",
  "• Kleinste Summe gewinnt die Runde und bekommt 0 Punkte, alle anderen ihre Kartensumme. Der Cabo-Sager, der nicht die kleinste Summe hat, bekommt +5 Punkte dazu.",
  "• Zeigt eine Auslage genau 12-12-13-13, bekommt diese Person 0 Punkte, alle anderen 50.",
  "• Wer in der Notierung genau 100 Punkte erreicht, bekommt 50 Punkte abgezogen.",
];

export const caboGamemodes: Record<CaboGamemodeKey, CaboGamemodeConfig> = {
  Standard: {
    name: "Standard",
    description: "Cabo nach den Grundregeln — wer am Ende wenig hat, gewinnt.",
    information: [
      "Cabo: Tausche und schaue, bis du die niedrigste Kartensumme hast.",
      ...baseRules,
    ],
  },
};

export const CABO_GAMEMODE_KEYS = Object.keys(
  caboGamemodes,
) as CaboGamemodeKey[];

export const gamemodeSlug = (key: CaboGamemodeKey) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

export const gamemodeFromSlug = (slug: string): CaboGamemodeKey =>
  CABO_GAMEMODE_KEYS.find(
    (key) =>
      gamemodeSlug(key) === slug.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
  ) ?? "Standard";

/** Mode rules plus the target the group agreed on for this particular game. */
export function gamemodeInformation(
  gamemode: CaboGamemodeKey,
  targetScore: number,
): string[] {
  return [
    ...caboGamemodes[gamemode].information,
    `• Das Spiel endet, sobald jemand am Rundenende mehr als ${targetScore} Punkte hat. Wer dann am wenigsten Punkte hat, gewinnt.`,
  ];
}
