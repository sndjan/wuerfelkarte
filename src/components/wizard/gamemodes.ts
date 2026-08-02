import { specialCardInfo } from "./specialCards";
import { WizardGamemodeKey, WizardSpecialCard } from "./types";

export type WizardGamemodeConfig = {
  name: string;
  description: string;
  information: string[];
  /** Whether the lobby offers the Sonderkarten selection for this mode. */
  usesSpecialCards: boolean;
};

const baseRules = [
  "• Jede Runde sagt jeder voraus, wie viele Stiche er machen wird.",
  "• Genau richtig getippt: 20 Punkte + 10 Punkte pro Stich.",
  "• Daneben getippt: 10 Minuspunkte pro Stich Abweichung.",
  "• Runde 1 wird mit einer Karte gespielt, Runde 2 mit zwei usw.",
  "• Der Geber wechselt nach jeder Runde im Uhrzeigersinn; getippt wird ab dem linken Nachbarn des Gebers.",
  "• Es wird so lange gespielt, bis alle 60 Karten verteilt sind: 3 Spieler → 20 Runden, 4 → 15, 5 → 12, 6 → 10.",
];

const anniversaryRules = [
  ...baseRules.slice(0, -1),
  "• Die gewählten Sonderkarten werden unter die 60 Charakterkarten gemischt — dadurch sind mehr Runden möglich, und selbst in der letzten Runde bleibt eine Karte für die Trumpffarbe übrig.",
  "• Ansonsten gelten die bekannten Wizard-Regeln.",
];

export const wizardGamemodes: Record<WizardGamemodeKey, WizardGamemodeConfig> = {
  Standard: {
    name: "Standard",
    description: "Wizard nach den Grundregeln des Pergaments.",
    information: [
      "Wizard: Sag genau voraus, wie viele Stiche du holst.",
      ...baseRules,
    ],
    usesSpecialCards: false,
  },
  "25 Jahre Edition": {
    name: "25 Jahre Edition",
    description: "Erweitertes Spiel mit den Sonderkarten der Jubiläumsedition.",
    information: [
      "25 Jahre Edition: Wizard mit Sonderkarten — mehr Optionen, schwerer vorherzusagen.",
      ...anniversaryRules,
    ],
    usesSpecialCards: true,
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

/**
 * Combines the gamemode's own rules with the Plus/Minus Eins addendum when that
 * per-game toggle is on, plus one paragraph per Sonderkarte in play.
 */
export function gamemodeInformation(
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
  specialCards: WizardSpecialCard[] = [],
): string[] {
  return [
    ...wizardGamemodes[gamemode].information,
    ...(plusMinusOne ? [plusMinusOneRule] : []),
    ...(specialCards.length > 0
      ? [
          `Sonderkarten im Spiel (${specialCards.length}):`,
          ...specialCards.map((card) => specialCardInfo(card).rule),
        ]
      : []),
  ];
}
