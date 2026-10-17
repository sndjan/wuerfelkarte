import { DartsGamemodeKey, DartsInRule, DartsOutRule } from "./types";

export type DartsGamemodeConfig = {
  name: string;
  description: string;
  information: string[];
};

export const dartsGamemodes: Record<DartsGamemodeKey, DartsGamemodeConfig> = {
  X01: {
    name: "X01",
    description: "301, 501 oder 701 — runterwerfen auf genau null.",
    information: [
      "X01: Jeder startet auf derselben Punktzahl und wirft sie mit je drei Darts pro Aufnahme auf genau null herunter.",
      "• Ein Dart zählt seinen Feldwert, im Triple-Ring dreifach, im Double-Ring doppelt. Das äußere Bull zählt 25, das innere 50 (und gilt als Double).",
      "• Wer unter null wirft, genau 1 übrig lässt oder nicht auf dem geforderten Ring ausmacht, hat überworfen: Die ganze Aufnahme zählt nicht, der Rest bleibt wie vor dem ersten Dart.",
      "• Wer zuerst auf null ist, gewinnt das Leg. Danach beginnt das nächste Leg — abwechselnd legt jeweils die nächste Person an.",
      "• Die Partie geht so lange, bis jemand die vereinbarte Anzahl Legs gewonnen hat.",
    ],
  },
};

export const DARTS_GAMEMODE_KEYS = Object.keys(
  dartsGamemodes,
) as DartsGamemodeKey[];

export const gamemodeSlug = (key: DartsGamemodeKey) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

export const gamemodeFromSlug = (slug: string): DartsGamemodeKey =>
  DARTS_GAMEMODE_KEYS.find(
    (key) =>
      gamemodeSlug(key) === slug.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
  ) ?? "X01";

export const IN_RULE_LABELS: Record<DartsInRule, string> = {
  straight: "Straight In",
  double: "Double In",
  master: "Master In",
};

export const IN_RULE_HINTS: Record<DartsInRule, string> = {
  straight: "Jeder Dart zählt sofort.",
  double: "Erst ein Double eröffnet das Konto.",
  master: "Double oder Triple eröffnet das Konto.",
};

export const OUT_RULE_LABELS: Record<DartsOutRule, string> = {
  straight: "Straight Out",
  double: "Double Out",
  master: "Master Out",
};

export const OUT_RULE_HINTS: Record<DartsOutRule, string> = {
  straight: "Genau null treffen, egal mit welchem Feld.",
  double: "Das letzte Feld muss ein Double sein (Bullseye zählt).",
  master: "Das letzte Feld muss ein Double oder Triple sein.",
};

/** Short line for headers and share text: "501 · Double Out · First to 3". */
export const rulesLabel = (settings: {
  startScore: number;
  inRule: DartsInRule;
  outRule: DartsOutRule;
  legsToWin: number;
}): string =>
  [
    String(settings.startScore),
    settings.inRule === "straight" ? null : IN_RULE_LABELS[settings.inRule],
    OUT_RULE_LABELS[settings.outRule],
    `First to ${settings.legsToWin}`,
  ]
    .filter(Boolean)
    .join(" · ");

/** Mode rules plus the settings this particular match was started with. */
export function gamemodeInformation(
  gamemode: DartsGamemodeKey,
  settings: {
    startScore: number;
    inRule: DartsInRule;
    outRule: DartsOutRule;
    legsToWin: number;
  },
): string[] {
  return [
    ...dartsGamemodes[gamemode].information,
    `• Diese Partie: Start bei ${settings.startScore}. ${
      IN_RULE_HINTS[settings.inRule]
    } ${OUT_RULE_HINTS[settings.outRule]}`,
    `• Es gewinnt, wer zuerst ${settings.legsToWin} ${
      settings.legsToWin === 1 ? "Leg" : "Legs"
    } geholt hat.`,
  ];
}
