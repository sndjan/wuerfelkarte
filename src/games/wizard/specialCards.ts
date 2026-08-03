import { WizardSpecialCard } from "./types";

export type WizardSpecialCardInfo = {
  id: WizardSpecialCard;
  name: string;
  emoji: string;
  /** One-liner for the lobby selector. */
  short: string;
  /** Full rule, shown in the game's "Regeln anzeigen" dialog. */
  rule: string;
};

/** All seven Sonderkarten, in the order the rulebook introduces them. */
export const WIZARD_SPECIAL_CARDS: WizardSpecialCardInfo[] = [
  {
    id: "gestaltenwandler",
    name: "Gestaltenwandler",
    emoji: "🎭",
    short: "Narr oder Zauberer — beim Ausspielen angesagt.",
    rule: "• Gestaltenwandler: Immer spielbar, auch wenn du bedienen könntest. Beim Ausspielen sagst du an, ob er ein Narr oder ein Zauberer ist, und behandelst ihn danach genau so. Aufgedeckt bestimmt der Kartengeber die Trumpffarbe.",
  },
  {
    id: "drache",
    name: "Drache",
    emoji: "🐉",
    short: "Höchste Karte im Spiel — verliert nur gegen die Fee.",
    rule: "• Drache: Immer spielbar und höher als jeder Zauberer, gewinnt also jeden Stich — außer die Fee liegt im selben Stich. Aufgedeckt bestimmt der Kartengeber die Trumpffarbe. Eröffnest du damit, gelten die Zauberer-Regeln.",
  },
  {
    id: "fee",
    name: "Fee",
    emoji: "🧚",
    short: "Niedrigste Karte im Spiel — schlägt aber den Drachen.",
    rule: "• Fee: Immer spielbar und niedriger als jeder Narr, verliert also jeden Stich — liegen Fee und Drache zusammen, gewinnt die Fee. Aufgedeckt gibt es keine Trumpffarbe. Eröffnest du damit, gelten die Narren-Regeln.",
  },
  {
    id: "bombe",
    name: "Bombe",
    emoji: "💣",
    short: "Ihr Stich gehört niemandem — im Tracker pro Runde markierbar.",
    rule: "• Bombe: Immer spielbar. Der Stich, in dem sie liegt, gehört niemandem und zählt zu keiner Vorhersage — markiere ihn in der Runde mit „Bombenstich“. Wer den Stich gewonnen hätte, eröffnet den nächsten. Aufgedeckt gibt es keine Trumpffarbe.",
  },
  {
    id: "werwolf",
    name: "Werwolf",
    emoji: "🐺",
    short: "Auf der Hand: Trumpfkarte tauschen und Trumpf bestimmen.",
    rule: "• Werwolf: Hast du ihn auf der Hand, tauschst du ihn zu Beginn der Stichrunde gegen die aufgedeckte Trumpfkarte und bestimmst die Trumpffarbe (oder „kein Trumpf“). Erst danach wird vorhergesagt. Aufgedeckt bestimmt der Kartengeber die Trumpffarbe.",
  },
  {
    id: "jongleur",
    name: "Jongleur",
    emoji: "🤹",
    short: "Wert 7½ in angesagter Farbe, danach Karten weitergeben.",
    rule: "• Jongleur: Immer spielbar, Wert 7½ in der von dir angesagten Farbe. Nach dem Stich gibt jeder gleichzeitig eine Handkarte verdeckt nach links — außer es war der letzte Stich der Runde. Aufgedeckt bestimmt der Kartengeber die Trumpffarbe.",
  },
  {
    id: "wolke",
    name: "Wolke",
    emoji: "☁️",
    short: "Wert 9¾; wer sie am Ende hat, ändert die Vorhersage um ±1.",
    rule: "• Wolke: Immer spielbar, Wert 9¾ in der von dir angesagten Farbe. Wer sie am Rundenende in seinen Stichen liegen hat, muss seine Vorhersage um +1 oder −1 ändern — trag das in der Runde ein. Liegen Wolke und Bombe im selben Stich, ändert sich nichts. Aufgedeckt bestimmt der Kartengeber die Trumpffarbe.",
  },
];

export const ALL_SPECIAL_CARDS: WizardSpecialCard[] = WIZARD_SPECIAL_CARDS.map(
  (card) => card.id,
);

export const specialCardInfo = (id: WizardSpecialCard): WizardSpecialCardInfo =>
  WIZARD_SPECIAL_CARDS.find((card) => card.id === id) ?? WIZARD_SPECIAL_CARDS[0];

/**
 * The rulebook insists Drache and Fee only ever enter play together — they
 * balance each other out, so the selector toggles them as a pair.
 */
export const COUPLED_CARDS: WizardSpecialCard[][] = [["drache", "fee"]];

/** Every card that has to follow `id` in or out of the deck, including itself. */
export const coupledWith = (id: WizardSpecialCard): WizardSpecialCard[] =>
  COUPLED_CARDS.find((group) => group.includes(id)) ?? [id];
