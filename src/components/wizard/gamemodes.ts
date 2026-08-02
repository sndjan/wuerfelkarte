import { WizardGamemodeKey } from "./types";

export type WizardGamemodeConfig = {
  name: string;
  description: string;
  information: string[];
};

const baseRules = [
  "• Jede Runde sagt jeder voraus, wie viele Stiche er machen wird.",
  "• Genau richtig getippt: 20 Punkte + 10 Punkte pro Stich.",
  "• Daneben getippt: 10 Minuspunkte pro Stich Abweichung.",
  "• Runde 1 wird mit einer Karte gespielt, Runde 2 mit zwei usw.",
  "• Der Geber wechselt nach jeder Runde im Uhrzeigersinn; getippt wird ab dem linken Nachbarn des Gebers.",
  "• Es wird so lange gespielt, bis alle 60 Karten verteilt sind: 3 Spieler → 20 Runden, 4 → 15, 5 → 12, 6 → 10.",
];

export const wizardGamemodes: Record<WizardGamemodeKey, WizardGamemodeConfig> = {
  Standard: {
    name: "Standard",
    description: "Wizard nach den Grundregeln des Pergaments.",
    information: [
      "Wizard: Sag genau voraus, wie viele Stiche du holst.",
      ...baseRules,
    ],
  },
};

export const WIZARD_GAMEMODE_KEYS = Object.keys(
  wizardGamemodes,
) as WizardGamemodeKey[];

export const gamemodeSlug = (key: WizardGamemodeKey) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

export const gamemodeFromSlug = (slug: string): WizardGamemodeKey =>
  WIZARD_GAMEMODE_KEYS.find(
    (key) => gamemodeSlug(key) === slug.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
  ) ?? "Standard";

const plusMinusOneRule =
  "• Plus/Minus Eins (aktiviert): Die Summe aller Vorhersagen darf nicht mit der Anzahl der möglichen Stiche übereinstimmen (der Tracker weist darauf hin, blockiert die Eingabe aber nicht).";

/** Combines the gamemode's own rules with the Plus/Minus Eins addendum when that per-game toggle is on. */
export function gamemodeInformation(
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
): string[] {
  return [
    ...wizardGamemodes[gamemode].information,
    ...(plusMinusOne ? [plusMinusOneRule] : []),
  ];
}
