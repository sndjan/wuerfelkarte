import type { ReactNode } from "react";

import { QUIZ_EMOJI } from "../config";
import { Die } from "./Die";
import { ScreenTour } from "./ScreenTour";

type QuizIntroProps = {
  /** YYYY-MM-DD of today's quiz. */
  date: string;
  streak: number;
  /** False while the solver table is still loading. */
  ready: boolean;
  /** The tour's last button: "Quiz starten", or a way back when reopened. */
  startLabel: string;
  onStart: () => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

// The example from "Was ist der beste Zug?": checked against the solver — entering
// 25 now gives away about 17 points on average against keeping 6 6 6 6.
const EXAMPLE_DICE = [6, 6, 6, 6, 1];

/**
 * The full-screen explanation before the day's first decision: the goal (the
 * best move, not the most points now) and a tour of the screen, whose last
 * step starts the quiz.
 */
export function QuizIntro({ date, streak, ready, startLabel, onStart }: QuizIntroProps) {
  const [year, month, day] = date.split("-");
  return (
    <div className="flex flex-col gap-7 px-4 pb-8">
      <div className="flex flex-col items-center gap-1 pt-2 text-center">
        <span className="text-6xl">{QUIZ_EMOJI}</span>
        <h2 className="mt-2 text-2xl font-extrabold">
          So funktioniert das Tagesquiz
        </h2>
        <p className="text-sm text-muted-foreground">
          {day}.{month}.{year}
          {streak > 0 &&
            ` · 🔥 ${streak} ${streak === 1 ? "Tag" : "Tage"} Serie`}
        </p>
      </div>

      <Section title="Worum geht's">
        <p>
          Du spielst <b>einen ganzen Zug</b> aus einem laufenden Kniffel-Spiel. Gesucht
          ist der <b>beste Zug</b> – nicht der, der jetzt die meisten Punkte
          bringt.
        </p>
      </Section>

      <Section title="Was ist der beste Zug?">
        <p>
          Der beste Zug ist der, mit dem du am Ende des Spiels im Schnitt die
          höchste Punktzahl erreichst. Dafür lohnt es sich manchmal, Punkte
          liegen zu lassen oder sogar ein Feld zu streichen.
        </p>
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
          <div className="grid max-w-60 grid-cols-5 gap-1.5">
            {EXAMPLE_DICE.map((value, i) => (
              <Die key={i} value={value} held={i < 4} />
            ))}
          </div>
          <p className="text-sm">
            <b>Beispiel:</b> Noch 2 Würfe. Viererpasch sofort eintragen bringt
            25 Punkte – und ist trotzdem ein Fehler. Besser:{" "}
            <b>6 6 6 6 halten</b> und auf den Kniffel würfeln.
            Das bringt im Schnitt rund 17 Punkte mehr.
          </p>
        </div>
      </Section>

      <Section title="Wie wird gespielt?">
        <ScreenTour ready={ready} startLabel={startLabel} onStart={onStart} />
      </Section>
    </div>
  );
}
