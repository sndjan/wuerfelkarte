import { Button } from "@/components/ui/button";
import { QUIZ_EMOJI } from "../config";
import { POINTS_PERFECT, PUZZLES_PER_DAY } from "../puzzles";

type QuizIntroProps = {
  /** YYYY-MM-DD of today's quiz. */
  date: string;
  streak: number;
  /** False while the solver table is still loading. */
  ready: boolean;
  onStart: () => void;
};

const RULES: [emoji: string, title: string, text: string][] = [
  ["📅", `${PUZZLES_PER_DAY} Aufgaben am Tag`, "Jeden Tag neu – und für alle dieselben."],
  ["🃏", "Mitten im Spiel", "Du bekommst eine Karte und einen Wurf. Mal hast du noch 2 Würfe, mal 1, mal keinen."],
  ["✋", "Halten, würfeln, eintragen", "Tippe Würfel zum Halten und würfle neu – oder trag direkt ein. Jede Aufgabe endet mit einem Eintrag."],
  ["🤖", "Gegen das perfekte Spiel", "Jede Entscheidung wird mit dem besten Zug verglichen. Es gelten die Regeln der Deutschen Kniffel-Meisterschaft."],
  ["🎯", `Bis zu ${POINTS_PERFECT} Punkte pro Aufgabe`, "Je weniger Punkte du im Schnitt verschenkst, desto mehr bekommst du. Danach siehst du die besten Züge."],
];

/**
 * The full-screen explanation before the day's first decision: what the quiz
 * is and how it scores. The start button stays at the bottom of the screen.
 */
export function QuizIntro({ date, streak, ready, onStart }: QuizIntroProps) {
  const [year, month, day] = date.split("-");
  return (
    // 100dvh minus the page header, so the button sits at the screen's bottom.
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col gap-6 px-4 pb-6">
      <div className="flex flex-col items-center gap-1 pt-2 text-center">
        <span className="text-6xl">{QUIZ_EMOJI}</span>
        <h2 className="mt-2 text-2xl font-extrabold">So funktioniert das Tagesquiz</h2>
        <p className="text-sm text-muted-foreground">
          {day}.{month}.{year}
          {streak > 0 && ` · 🔥 ${streak} ${streak === 1 ? "Tag" : "Tage"} Serie`}
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {RULES.map(([emoji, title, text]) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-xl shadow-xs">
              {emoji}
            </span>
            <div>
              <p className="font-bold">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <Button size="lg" className="sticky bottom-6 mt-auto w-full" disabled={!ready} onClick={onStart}>
        {ready ? "Quiz starten" : "Lädt…"}
      </Button>
    </div>
  );
}
