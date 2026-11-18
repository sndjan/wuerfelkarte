/**
 * The home page's „Tipp des Tages“: one line from the Kniffel guide per day,
 * in order, each linking the chapter that explains it.
 */

export type DailyTip = {
  text: string;
  /** Slug of the guide chapter that explains the tip. */
  chapter: string;
};

export const dailyTips: DailyTip[] = [
  { chapter: "erster-wurf", text: "Zwei Paare im ersten Wurf? Behalte nur das höhere und würfel drei neu." },
  { chapter: "kniffel", text: "Vier Gleiche würfelst du immer weiter, sogar vier Einser." },
  { chapter: "oberer-block", text: "Drei von jeder Zahl oben ergeben genau 63. Zähl mit: Wie viel liegst du über oder unter drei pro Feld?" },
  { chapter: "oberer-block", text: "Drei Gleiche gehören früh in ihr oberes Feld, nicht in den 3er-Pasch. Auf leerer Karte gilt das sogar für drei Einser." },
  { chapter: "oberer-block", text: "Die dritte Sechs in Sechser ist rund 18 Punkte wert, nicht 6." },
  { chapter: "strassen-full-house", text: "Kleine Straße liegt, die Große ist noch offen? Halte die vier in Folge und würfel weiter. Die Kleine kann dir nicht mehr entgehen." },
  { chapter: "strassen-full-house", text: "2345 ist mehr wert als 1234 oder 3456: Sie wird mit einer 1 oder einer 6 zur Großen Straße." },
  { chapter: "strassen-full-house", text: "6 6 6 5 5 mit zwei Würfen übrig? Halte nur die Sechsen. Sechser mit vier oder fünf Würfeln ist mehr wert als das Full House." },
  { chapter: "strassen-full-house", text: "Ein kleines Full House wie 2 2 2 3 3 nimmst du spätestens nach dem zweiten Wurf." },
  { chapter: "regeln", text: "Ein Kniffel zählt nicht als Full House. 6 6 6 6 6 im Full House bringt 0 Punkte." },
  { chapter: "kniffel", text: "Drei Gleiche liegen, ein Wurf ist übrig? Halte nur die drei. Ein vierter Würfel dazu kostet im Schnitt 3,5 Punkte." },
  { chapter: "streichen", text: "Ab der Spielmitte ist Kniffel das erste Feld, das du streichst." },
  { chapter: "streichen", text: "Früh im Spiel streichst du lieber Einser als Kniffel. Eine kurze Einser kostet dich höchstens 3 Punkte zum Bonus." },
  { chapter: "streichen", text: "Chance früh nur für eine hohe Summe: 17 Punkte im ersten Zug sind schlechter als eine 1 in Einser." },
  { chapter: "kniffel", text: "Streichst du Kniffel, verlierst du auch jeden Extra-Kniffel. Die 50 Bonuspunkte gibt es nur, wenn das Feld 50 hält." },
  { chapter: "kniffel", text: "Extra-Kniffel? Zuerst in sein oberes Feld, wenn es offen ist. 25 in Fünfer sichert fast den Bonus." },
  { chapter: "oberer-block", text: "Gib den Bonus später auf, als du denkst. Selbst 10 unter Soll gehören drei Fünfen noch in Fünfer." },
  { chapter: "grundregeln", text: "Hör nicht zu früh auf: Perfektes Spiel stoppt in weniger als 1 von 10 Zügen vor dem dritten Wurf." },
  { chapter: "situationen", text: "Nur noch Chance offen? Mit zwei Würfen übrig hältst du nur Fünfen und Sechsen, mit einem auch die Vieren." },
  { chapter: "perfektes-spiel", text: "Auch perfektes Spiel bleibt in 1 von 7 Spielen unter 200. Ein schlechtes Spiel heißt nicht, dass du schlecht spielst." },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The tip for a local date (YYYY-MM-DD): the list in order, one per day, round and round. */
export function tipForDate(date: string): DailyTip {
  const [y, m, d] = date.split("-").map(Number);
  const days = Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
  return dailyTips[((days % dailyTips.length) + dailyTips.length) % dailyTips.length];
}
