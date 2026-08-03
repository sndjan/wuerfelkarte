export type PointField = {
  key: string;
  label: string;
  options?: Array<number | string>;
};

export type BonusConfig = {
  label: string;
  fields: string[];
  minSum: number;
  bonus: number;
};

export type GamemodeConfig = {
  name: string;
  fields: PointField[];
  bonus?: BonusConfig;
  description?: string;
  information?: string[];
};

const standardOptions = [
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  26, 27, 28, 29, 30,
];
const miniOptions = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
];
const extendedOptions = [
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
];

const wunderPlusFields: PointField[] = [
  { key: "Einser", label: "Einser", options: [1, 2, 3, 4, 5] },
  { key: "Zweier", label: "Zweier", options: [2, 4, 6, 8, 10] },
  { key: "Dreier", label: "Dreier", options: [3, 6, 9, 12, 15] },
  { key: "Vierer", label: "Vierer", options: [4, 8, 12, 16, 20] },
  { key: "Fünfer", label: "Fünfer", options: [5, 10, 15, 20, 25] },
  { key: "Sechser", label: "Sechser", options: [6, 12, 18, 24, 30] },
  { key: "Dreierpasch", label: "Dreierpasch", options: [...standardOptions] },
  { key: "Viererpasch", label: "Viererpasch", options: [...standardOptions] },
  { key: "Full House", label: "Full House", options: [25] },
  { key: "Kleine Straße", label: "Kleine Straße", options: [30] },
  { key: "Große Straße", label: "Große Straße", options: [40] },
  {
    key: "Wunder",
    label: "Wunder",
    options: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  },
  { key: "Chance", label: "Chance", options: [...standardOptions] },
];

const wunderPlusBonus: BonusConfig = {
  label: "",
  fields: ["Einser", "Zweier", "Dreier", "Vierer", "Fünfer", "Sechser"],
  minSum: 63,
  bonus: 35,
};

export const gamemodes: Record<string, GamemodeConfig> = {
  Wunder: {
    name: "Wunder",
    description: "Der Klassiker mit 5 Würfeln und allen bekannten Kategorien.",
    fields: [
      { key: "Einser", label: "Einser", options: [1, 2, 3, 4, 5] },
      { key: "Zweier", label: "Zweier", options: [2, 4, 6, 8, 10] },
      { key: "Dreier", label: "Dreier", options: [3, 6, 9, 12, 15] },
      { key: "Vierer", label: "Vierer", options: [4, 8, 12, 16, 20] },
      { key: "Fünfer", label: "Fünfer", options: [5, 10, 15, 20, 25] },
      { key: "Sechser", label: "Sechser", options: [6, 12, 18, 24, 30] },
      {
        key: "Dreierpasch",
        label: "Dreierpasch",
        options: standardOptions,
      },
      {
        key: "Viererpasch",
        label: "Viererpasch",
        options: standardOptions,
      },
      { key: "Full House", label: "Full House", options: [25] },
      { key: "Kleine Straße", label: "Kleine Straße", options: [30] },
      { key: "Große Straße", label: "Große Straße", options: [40] },
      { key: "Wunder", label: "Wunder", options: [50] },
      { key: "Chance", label: "Chance", options: standardOptions },
    ],
    bonus: {
      label: "",
      fields: ["Einser", "Zweier", "Dreier", "Vierer", "Fünfer", "Sechser"],
      minSum: 63,
      bonus: 35,
    },
  },
  WunderPlus: {
    name: "Wunder+",
    description:
      "Klassisches Wunder mit eingeschränkter Zusatz-Wunder-Regel.",
    information: [
      "Wunder+ folgt den Standardregeln mit einer wichtigen Änderung bei der Zusatz-Wunder-Regel:",
      "• Der zweite/weitere Wunder bringt weiterhin 50 Bonuspunkte.",
      "• Die Zusatzeintragung muss jedoch in ein passendes Kästchen eingetragen werden – nicht einfach irgendein freies.",
      "• Passende Kästchen (Beispiel Vierer-Wunder): Vierer (oben), Dreierpasch, Viererpasch oder Chance.",
      "• NICHT erlaubt: Full House, Kleine Straße oder Große Straße.",
      "• Ist kein passendes Kästchen frei, muss ein Kästchen gestrichen werden.",
      "• Im Scoreblock: Wähle '50' im passenden Kästchen aus, um einen Zusatz-Wunder einzutragen.",
    ],
    fields: wunderPlusFields,
    bonus: wunderPlusBonus,
  },
  Battle: {
    name: "Battle",
    description:
      "Kompetitives Duell: Jedes Feld kann nur ein Spieler erfolgreich holen.",
    information: [
      "Battle macht Kniffel zum taktischen Duell – jede Entscheidung beeinflusst alle Mitspieler:",
      "• Wer ein Feld einträgt, blockiert es automatisch in den Spalten aller anderen Spieler.",
      "• Wer ein Feld streicht, zwingt alle anderen, dieses Pflichtfeld als Nächstes zu versuchen.",
      "• Es gibt kein harmloses Streichen: Jedes Streichen bewaffnet die ×2-Wette für deine Gegner.",
      "• Doppelte Punkte: Schafft ein anderer das ihm aufgezwungene Pflichtfeld, zählt dieses Feld doppelt (auch für den Bonus).",
      "• Schafft ein anderer Spieler das Pflichtfeld, wird es bei den restlichen ebenfalls blockiert – nur der Erste kassiert die doppelten Punkte.",
      "• Solange offene Pflichtfelder bestehen, versuchen die betroffenen Spieler zuerst dieses Feld.",
      "• Basis sind die Wunder+ Regeln inklusive Bonus. Höchste Gesamtpunktzahl gewinnt.",
    ],
    fields: wunderPlusFields,
    bonus: wunderPlusBonus,
  },
  Chaoswunder: {
    name: "Chaoswunder",
    description: "Ein chaotischer Twist auf den Klassiker mit 5 Würfeln und allen bekannten Kategorien.",
    fields: [
      { key: "Einser", label: "Einser", options: [1, 2, 3, 4, 5] },
      { key: "Zweier", label: "Zweier", options: [2, 4, 6, 8, 10] },
      { key: "Dreier", label: "Dreier", options: [3, 6, 9, 12, 15] },
      { key: "Vierer", label: "Vierer", options: [4, 8, 12, 16, 20] },
      { key: "Fünfer", label: "Fünfer", options: [5, 10, 15, 20, 25] },
      { key: "Sechser", label: "Sechser", options: [6, 12, 18, 24, 30] },
      {
        key: "Dreierpasch",
        label: "Dreierpasch",
        options: standardOptions,
      },
      {
        key: "Viererpasch",
        label: "Viererpasch",
        options: standardOptions,
      },
      { key: "Full House", label: "Full House", options: [25] },
      { key: "Kleine Straße", label: "Kleine Straße", options: [30] },
      { key: "Große Straße", label: "Große Straße", options: [40] },
      { key: "Wunder", label: "Wunder", options: [50] },
      { key: "Chance", label: "Chance", options: standardOptions },
    ],
    bonus: {
      label: "",
      fields: ["Einser", "Zweier", "Dreier", "Vierer", "Fünfer", "Sechser"],
      minSum: 63,
      bonus: 35,
    },
  },
  MiniWunder: {
    name: "Mini Wunder",
    description:
      "Kompakte Version mit nur 3 Würfeln. Für schnelle und spannende Runden.",
    information: [
      "Mini Wunder ist eine vereinfachte Version des Klassikers mit folgenden Änderungen:",
      "• Es werden nur 3 Würfel statt 5 verwendet.",
      "• Weniger und neue Kategorien wie 'Zweierpasch' (zwei gleiche Würfel + beliebiger Würfel), 'Tiny House' (zwei gleiche Würfel + beliebiger Würfel) und 'Mini Straße' (drei Würfel in Folge).",
      "• Die Punktewerte sind niedriger, um die schnelle Spielweise zu unterstützen.",
      "• Der Bonus für die oberen Felder ist auf 15 Punkte (also jeweils zwei pro Zahl) festgelegt.",
    ],
    fields: [
      { key: "Vierer", label: "Vierer", options: [4, 8, 12] },
      { key: "Fünfer", label: "Fünfer", options: [5, 10, 15] },
      { key: "Sechser", label: "Sechser", options: [6, 12, 18] },
      { key: "Zweierpasch", label: "Zweierpasch", options: miniOptions },
      { key: "Tiny House", label: "Tiny House", options: [15] },
      { key: "Mini Straße", label: "Mini Straße", options: [20] },
      { key: "Mini Wunder", label: "Mini Wunder", options: [30] },
      { key: "Chance", label: "Chance", options: miniOptions },
    ],
    bonus: {
      label: "",
      fields: ["Vierer", "Fünfer", "Sechser"],
      minSum: 30,
      bonus: 15,
    },
  },
  SuperWunder: {
    name: "Super Wunder",
    description:
      "Erweiterter Modus mit 6 Würfeln, spannenden Kategorien und viel mehr Punkten.",
    information: [
      "Super Wunder unterscheidet sich vom Klassiker in folgenden Punkten:",
      "• Es werden 6 Würfel statt 5 verwendet.",
      "• Die Zahlenfelder (Einser bis Sechser) können höhere Summen erreichen.",
      "• Neue Kategorien wie 'Fünferpasch', 'Dreifach-Paar' (drei mal zwei gleiche), 'Full Villa' (zwei mal drei gleiche) und 'Riesige Straße' kommen hinzu.",
      "• Das Super Wunder ist mit 100 Punkten deutlich höher bewertet.",
      "• Die Anforderungen für den Bonus steigen (mindestens 72 Punkte in den oberen Feldern, also jeweils vier pro Zahl).",
    ],
    fields: [
      { key: "Einser", label: "Einser", options: [1, 2, 3, 4, 5, 6] },
      { key: "Zweier", label: "Zweier", options: [2, 4, 6, 8, 10, 12] },
      { key: "Dreier", label: "Dreier", options: [3, 6, 9, 12, 15, 18] },
      { key: "Vierer", label: "Vierer", options: [4, 8, 12, 16, 20, 24] },
      { key: "Fünfer", label: "Fünfer", options: [5, 10, 15, 20, 25, 30] },
      { key: "Sechser", label: "Sechser", options: [6, 12, 18, 24, 30, 36] },
      {
        key: "Viererpasch",
        label: "Viererpasch",
        options: extendedOptions,
      },
      {
        key: "Fünferpasch",
        label: "Fünferpasch",
        options: extendedOptions,
      },
      { key: "Dreifach-Paar", label: "Dreifach-Paar", options: [30] },
      { key: "Full Villa", label: "Full Villa", options: [45] },
      { key: "Große Straße", label: "Große Straße", options: [40] },
      { key: "Riesige Straße", label: "Riesige Straße", options: [55] },
      { key: "Super Wunder", label: "Super Wunder", options: [100] },
      {
        key: "Chance",
        label: "Chance",
        options: extendedOptions,
      },
    ],
    bonus: {
      label: "",
      fields: ["Einser", "Zweier", "Dreier", "Vierer", "Fünfer", "Sechser"],
      minSum: 72,
      bonus: 50,
    },
  },
};
