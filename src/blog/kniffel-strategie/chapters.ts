/** The Kniffel strategy guide's chapters, in reading order. Content: content.tsx. */

export type GuideChapter = {
  slug: string;
  title: string;
  /** The chapter page's meta description. */
  description: string;
};

export const GUIDE_SLUG = "kniffel-strategie";
export const GUIDE_TITLE = "Kniffel-Strategie";

export const guideChapters: GuideChapter[] = [
  {
    slug: "regeln",
    title: "Die Regeln dahinter",
    description: "Die Meisterschaftsregel, für die jede Zahl dieses Guides gerechnet ist: Felder, Extra-Kniffel und Streichen.",
  },
  {
    slug: "perfektes-spiel",
    title: "Was perfektes Spiel bringt",
    description: "249,6 Punkte im Schnitt: was der Solver erreicht, wie stark das Glück streut und woher die Punkte kommen.",
  },
  {
    slug: "grundregeln",
    title: "Sieben Grundregeln",
    description: "Sieben Faustregeln, die den Großteil der Punkte holen: Bonus, hohe Gleiche, Straßen und wohin die Null gehört.",
  },
  {
    slug: "erster-wurf",
    title: "Der erste Wurf",
    description: "Welche Würfel du im ersten Wurf behältst: die Rangfolge des Solvers von Vierling bis zum einzelnen hohen Würfel.",
  },
  {
    slug: "oberer-block",
    title: "Oberer Block und Bonus",
    description: "Wie du die 35 Bonuspunkte holst, warum jede Sechs mehr wert ist als ihre Augen und wann du den Bonus aufgibst.",
  },
  {
    slug: "strassen-full-house",
    title: "Straßen und Full House",
    description: "Wann du auf die Große Straße gehst, warum 2345 besser ist als 1234 und wann sich ein Full House lohnt.",
  },
  {
    slug: "kniffel",
    title: "Kniffel jagen",
    description: "Vierlinge, Drillinge und Extra-Kniffel: wann du auf Kniffel würfelst und wohin ein zweiter Kniffel gehört.",
  },
  {
    slug: "streichen",
    title: "Streichen: wohin mit der Null",
    description: "Welches Feld du streichst, wenn nichts passt: früh Einser oder Chance, ab der Spielmitte zuerst Kniffel.",
  },
  {
    slug: "situationen",
    title: "Gleiche Würfel, andere Karte",
    description: "Warum derselbe Wurf je nach Karte anders gespielt wird: Rückstand beim Bonus, gesicherter Bonus und der letzte Zug.",
  },
  {
    slug: "turnier",
    title: "Turnier: Schnitt oder Sieg?",
    description: "Wie viel Glück im Spiel steckt und wann du gegen einen Gegner vom besten Schnitt abweichen solltest.",
  },
];

export const chapterHref = (slug: string) => `/blog/${GUIDE_SLUG}/${slug}`;
export const guideHref = `/blog/${GUIDE_SLUG}`;
