import { Flip7GamemodeKey } from "./types";

export type Flip7GamemodeConfig = {
  name: string;
  description: string;
  information: string[];
};

const baseRules = [
  "• Jede Runde bekommt ihr reihum Karten offen ausgeteilt und entscheidet jedes Mal: Stopp oder noch eine.",
  "• Zahlenkarten zählen ihren Wert. Wer eine Zahl aufdeckt, die schon vor ihm liegt, hat sich verzockt und bekommt 0 Punkte für die Runde.",
  "• Bonuskarten (+2 bis +10) werden nach dem Verdoppeln addiert, die ×2-Karte verdoppelt nur die Zahlenkarten.",
  "• 7 verschiedene Zahlenkarten = Flip 7: Die Runde endet sofort für alle, es gibt 15 Extrapunkte.",
  "• Eine Runde endet außerdem, wenn niemand mehr im Spiel ist — alle sind ausgestiegen oder verzockt.",
  "• Aktionskarten: Freeze wirft eine aktive Person aus der Runde (Punkte zählen trotzdem), Flip Three gibt ihr 3 weitere Karten, Second Chance rettet einmalig vor dem Verzocken.",
];

export const flip7Gamemodes: Record<Flip7GamemodeKey, Flip7GamemodeConfig> = {
  Standard: {
    name: "Standard",
    description: "Flip 7 nach den Grundregeln — Stopp oder noch eine.",
    information: [
      "Flip 7: Sammle Zahlenkarten, aber verzocke dich nicht.",
      ...baseRules,
    ],
  },
};

export const FLIP7_GAMEMODE_KEYS = Object.keys(
  flip7Gamemodes,
) as Flip7GamemodeKey[];

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
