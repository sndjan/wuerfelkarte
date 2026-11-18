import type { ReactNode } from "react";

import {
  A,
  Bars,
  Callout,
  Caption,
  Examples,
  H2,
  H3,
  List,
  P,
  Percentiles,
  PracticeCard,
  Rules,
  Table,
} from "../components/Blocks";
import { chapterHref } from "./chapters";

/**
 * The Kniffel strategy guide, chapter by chapter. Every number comes from the
 * exact solver in src/games/yatzy/solver.ts (Meisterschaftsregel) and a
 * simulation of 100,000 games played by it, run on 2026-10-30.
 */

const best = (v: ReactNode) => ({ v, best: true });

function Regeln() {
  return (
    <>
      <P>
        Jede Zahl in diesem Guide stammt aus einem exakten Solver für die <b>Meisterschaftsregel</b> aus der
        Kniffel-Anleitung von Schmidt Spiele. Es ist derselbe Solver, der das Tagesquiz der Würfelkarte bewertet.
        Normales Kniffel und Yahtzee weichen in Kleinigkeiten ab, die manche Entscheidung ändern. Prüf also, ob ihr
        am Tisch nach diesen Regeln spielt.
      </P>
      <Table
        head={["Feld", "Punkte", "Hinweis"]}
        rows={[
          ["Einser bis Sechser", "Summe dieser Augenzahl", "Ab 63 insgesamt gibt es 35 Bonuspunkte"],
          ["3er-Pasch", "Summe aller fünf Würfel", ""],
          ["4er-Pasch", "Summe aller fünf Würfel", ""],
          ["Full House", "25", "Ein Kniffel zählt nicht als Full House"],
          ["Kleine Straße (4 in Folge)", "30", ""],
          ["Große Straße (5 in Folge)", "40", ""],
          ["Kniffel (5 Gleiche)", "50", ""],
          ["Chance", "Summe aller fünf Würfel", ""],
        ]}
      />
      <P>Drei weitere Regeln sind für die Strategie wichtig:</P>
      <List>
        <li>
          <b>Jeder weitere Kniffel bringt 50 Punkte extra</b>, aber nur, wenn im Kniffel-Feld schon 50 stehen. Ist
          Kniffel gestrichen, bringen spätere Kniffel nichts.
        </li>
        <li>
          <b>Ein Extra-Kniffel muss in ein passendes Feld:</b> sein oberes Feld, 3er-Pasch, 4er-Pasch oder Chance. Er
          zählt nie als Full House oder Straße. Ist keines davon offen, streichst du ein beliebiges Feld und bekommst
          die 50 trotzdem.
        </li>
        <li>
          <b>Du darfst jedes offene Feld jederzeit streichen</b>, also eine 0 eintragen. Eine Reihenfolge gibt es
          nicht.
        </li>
      </List>
      <P>
        Pro Zug hast du drei Würfe: einmal alle fünf Würfel, danach bis zu zwei Mal beliebig viele davon neu. Nach
        jedem Wurf darfst du aufhören und eintragen.
      </P>
    </>
  );
}

function PerfektesSpiel() {
  return (
    <>
      <P>
        Perfektes Spiel nach diesen Regeln bringt im Schnitt <b>249,6 Punkte</b> pro Spiel. Das ist der exakte
        Erwartungswert des Solvers. 100.000 simulierte Solver-Spiele kommen auf dieselben 249,6, mit einer
        Standardabweichung von 46,6 Punkten.
      </P>
      <Percentiles
        label="Endstand bei perfektem Spiel: 5 % unter 179, Median 248, 95 % unter 329"
        items={[
          ["5 %", 179],
          ["10 %", 195],
          ["25 %", 217],
          ["50 %", 248],
          ["75 %", 272],
          ["90 %", 311],
          ["95 %", 329],
        ]}
      />
      <Caption>Endstand bei perfektem Spiel, nach Perzentil</Caption>
      <Callout>
        Auch perfektes Spiel bleibt in etwa <b>1 von 7 Spielen unter 200</b> und kommt in etwa 1 von 8 über 300. Ein
        einzelnes Spiel sagt wenig über dein Können: Über wenige Spiele entscheidet vor allem das Glück.
      </Callout>
      <H2>Woher die Punkte kommen</H2>
      <P>Durchschnitt pro Feld über 100.000 simulierte Spiele:</P>
      <Table
        head={["Feld", "Ø Punkte", "Mit 0", "Typischer Zug"]}
        numeric={[1, 2, 3]}
        rows={[
          ["Einser", "1,9", "10,1 %", "6,6"],
          ["Zweier", "5,3", "1,5 %", "6,5"],
          ["Dreier", "8,6", "0,8 %", "6,5"],
          ["Vierer", "12,2", "0,5 %", "6,3"],
          ["Fünfer", "15,7", "0,4 %", "6,2"],
          ["Sechser", "19,3", "0,5 %", "6,4"],
          ["Bonus (35)", "24,0", "31,5 % verpasst", ""],
          ["3er-Pasch", "22,0", "3,3 %", "7,9"],
          ["4er-Pasch", "13,1", "37,3 %", "9,6"],
          ["Full House", "22,7", "9,2 %", "6,1"],
          ["Kleine Straße", "29,5", "1,7 %", "5,9"],
          ["Große Straße", "32,7", "18,3 %", "7,5"],
          ["Kniffel", "16,5", "67,0 %", "8,8"],
          ["Chance", "22,1", "nie", "6,8"],
          ["Extra-Kniffel (je 50)", "4,1", "0,08 pro Spiel", ""],
        ]}
      />
      <P>Drei Dinge fallen auf:</P>
      <List>
        <li>Den Bonus gibt es in <b>68,5 %</b> der Spiele.</li>
        <li>
          Im Kniffel-Feld stehen nur in <b>33 %</b> der Spiele 50 Punkte. Es ist die häufigste Null.
        </li>
        <li>
          Perfektes Spiel hört nur in <b>8,8 %</b> der Züge vor dem dritten Wurf auf.
        </li>
      </List>
      <P>
        Zum Vergleich: Tom Verhoeffs optimaler Solver für amerikanisches Yahtzee (100 Punkte für Extra-Yahtzees und
        Joker-Regeln) kommt auf 254,59. Die Meisterschaftsregel ist etwas knauseriger, vor allem weil ein
        Extra-Kniffel 50 statt 100 Punkte bringt.
      </P>
    </>
  );
}

function Grundregeln() {
  return (
    <>
      <P>
        Spiel auf den Endstand, nicht auf die Punkte dieses Zugs. Oft trägt der beste Zug jetzt weniger ein oder
        würfelt eine fertige Kombination weiter, weil er wertvollere Chancen offen hält.
      </P>
      <Rules
        items={[
          {
            title: "Kämpf um den Bonus",
            text: "Drei von jeder Zahl oben ergeben genau 63. Perfektes Spiel holt die 35 Punkte in etwa 7 von 10 Spielen.",
          },
          {
            title: "Behalte hohe Gleiche",
            text: "Ein Paar Sechsen oder Fünfen ist der Standard, wenn nichts Besseres liegt. Drei oder mehr Gleiche behältst du fast immer.",
          },
          {
            title: "Ein Paar, nie zwei",
            text: "Mit zwei Paaren im ersten Wurf behältst du nur das höhere und würfelst drei neu. Früh auf Full House zu gehen ist ein Fehler.",
          },
          {
            title: "Nimm die Straße, wenn sie liegt",
            text: "Eine Große Straße im ersten Wurf ist nach dem Vierling der beste Start. Vier in Folge (1234, 2345, 3456) behältst du und würfelst weiter.",
          },
          {
            title: "Hör nicht zu früh auf",
            text: "Weiterwürfeln ist viel öfter richtig, als es sich anfühlt. Perfektes Spiel stoppt in weniger als 1 von 10 Zügen vor dem dritten Wurf.",
          },
          {
            title: "Chance und Pasch sind dein Netz",
            text: "Chance nimmst du spät für einen Fehlwurf mit hoher Summe, nicht früh für eine mittelmäßige.",
          },
          {
            title: "Streich zuerst Kniffel, Einser oder 4er-Pasch",
            text: "Wenn eine Null fällig ist, kosten diese Felder am wenigsten. Wann welches dran ist, steht im Kapitel Streichen.",
          },
        ]}
      />
    </>
  );
}

function ErsterWurf() {
  return (
    <>
      <P>
        Auf leerer Karte bewertet der Solver jeden möglichen Halt. <b>Gewinn</b> ist der erwartete Endstand nach dem
        besten Halt minus 249,6, dem Wert einer leeren Karte vor dem ersten Wurf. Er zeigt, wie gut der Wurf ist,
        nicht wie viel die Wahl bringt. Was die Wahl bringt, steht darunter: was die zweitbeste Möglichkeit kostet.
      </P>
      <Examples
        items={[
          { dice: "66661", held: "11110", gain: "+24,6", title: "Vierling: weiter auf Kniffel", alt: "Aufhören und eintragen kostet 4,6" },
          { dice: "12345", held: "11111", gain: "+7,5", title: "Große Straße nehmen (auch 2 3 4 5 6)", alt: "Nur 2345 halten kostet 6,7" },
          { dice: "66655", held: "11100", gain: "+9,5", title: "Hohes Full House aufbrechen", alt: "Full House halten kostet 5,7" },
          { dice: "66116", held: "11001", gain: "+9,5", title: "Nie das zweite Paar dazu halten", alt: "1 6 6 6 halten kostet 3,0" },
          { dice: "44412", held: "11100", gain: "+5,9", title: "Drilling halten, Rest neu", alt: "2 4 4 4 halten kostet 2,8" },
          { dice: "12333", held: "00111", gain: "+4,2", title: "Drilling schlägt Straßenzug", alt: "2 3 3 3 halten kostet 2,6" },
          { dice: "22233", held: "11100", gain: "+2,3", title: "Kleiner Drilling: mit zwei Würfen trotzdem weiter", alt: "Full House halten kostet 2,2" },
          { dice: "55432", held: "10111", gain: "+0,8", title: "Offene Vierer-Straße schlägt Fünfer-Paar", alt: "Nur 5 5 halten kostet 2,2" },
          { dice: "66543", held: "11000", gain: "−0,4", title: "Paar Sechsen schlägt 3456", alt: "5 6 6 halten kostet 1,9" },
          { dice: "66551", held: "11000", gain: "−0,4", title: "Zwei Paare: nur das höhere", alt: "Die Fünfen halten kostet 0,9" },
          { dice: "11234", held: "01111", gain: "−2,9", title: "Einseitige Vierer-Straße trotzdem halten", alt: "Nur 2 3 4 halten kostet 0,7" },
          { dice: "33456", held: "11000", gain: "−2,9", title: "Münzwurf: Paar oder Straßenzug", alt: "3 4 5 6 halten kostet nur 0,1" },
          { dice: "22456", held: "11000", gain: "−3,7", title: "Kleines Paar ist besser als nichts", alt: "2 4 5 halten kostet 0,4" },
          { dice: "12356", held: "00010", gain: "−4,1", title: "Nichts da: einen hohen Würfel behalten", alt: "Die 6 statt der 5 kostet 0,1" },
          { dice: "11456", held: "00010", gain: "−4,1", title: "Ein Paar Einser ist weniger wert als eine 5", alt: "4 5 halten ist fast gleich gut" },
        ]}
      />
      <Callout>
        <b>Die Rangfolge, das Beste zuerst:</b> Vierling, Große Straße, Drilling aus 4, 5 oder 6, Drilling aus 2
        oder 3, offene Vierer-Straße (2345), Paar Sechsen, drei Einser, Paar Fünfen, einseitige Vierer-Straße (1234,
        3456), kleines Paar, ein hoher Würfel.
      </Callout>
      <H3>Zwei Paare? Nur eins behalten.</H3>
      <P>
        Mit 6 6 5 5 1 behältst du die Sechsen und würfelst drei neu. Die Fünfen dazu zu halten wirkt sicherer,
        kostet aber Punkte: Sechser mit vier oder fünf Würfeln ist mehr wert als ein frühes Full House. Liegt schon
        ein Drilling, wirf das zweite Paar immer weg. Mit 6 6 1 1 6 behältst du 6 6 6.
      </P>
      <PracticeCard>
        Im Kniffel-Training siehst du nach jedem Zug, was der Solver behalten hätte und was dich dein Zug gekostet
        hat.
      </PracticeCard>
    </>
  );
}

function ObererBlock() {
  return (
    <>
      <P>
        Der Bonus ist der größte Ausschlag, den du selbst steuerst. Drei von jeder Zahl ergeben genau 63. Zähl also
        jedes obere Feld gegen dieses Soll von drei Würfeln und führ ein laufendes Plus oder Minus.
      </P>
      <H2>Drillinge und Vierlinge früh nach oben</H2>
      <P>
        Auf leerer Karte trägt der Solver drei Gleiche in ihr oberes Feld ein, nicht in den 3er-Pasch. Das gilt für
        jede Zahl, sogar für Einser.
      </P>
      <Table
        head={["Letzter Wurf", "Bester Eintrag", "Zweitbester", "Kostet"]}
        numeric={[3]}
        rows={[
          ["5 5 5 4 1", best("Fünfer 15"), "3er-Pasch 20", "3,9"],
          ["6 6 6 3 2", best("Sechser 18"), "3er-Pasch 23", "1,4"],
          ["1 1 1 2 3", best("Einser 3"), "Zweier 2 (als Streichung)", "9,1"],
          ["5 5 5 5 1", best("Fünfer 20"), "4er-Pasch 21", "7,6"],
          ["3 3 3 3 6", best("Dreier 12"), "4er-Pasch 18", "3,6"],
        ]}
      />
      <H2>Jede Sechs ist mehr wert als ihre Augen</H2>
      <P>
        Erwarteter Endstand, wenn bisher nur Sechser eingetragen ist, nach Zahl der Sechsen darin. Von zwei auf drei
        Sechsen sind es <b>18,3 Punkte, nicht 6</b>. Eine vierte Sechs bringt fast genauso viel, weil der Überschuss ein
        schwaches Feld woanders ausgleicht. Jede zusätzliche Eins in Einser ist dagegen nur etwa 2,8 Punkte wert.
      </P>
      <Bars
        label="Erwarteter Endstand nach Sechsen in Sechser: 0: 212,4; 1: 218,6; 2: 228,0; 3: 246,3; 4: 264,0; 5: 275,3"
        max={280}
        keyIndex={3}
        rows={[
          { label: "0 Sechsen", value: 212.4 },
          { label: "1 Sechs", value: 218.6 },
          { label: "2 Sechsen", value: 228.0 },
          { label: "3 Sechsen", value: 246.3 },
          { label: "4 Sechsen", value: 264.0 },
          { label: "5 Sechsen", value: 275.3 },
        ]}
      />
      <Caption>Achse ab 0. Rechts: Zuwachs zur Zeile davor. Grün: der Schritt auf das Soll.</Caption>
      <H2>Punkte kommen in Stufen</H2>
      <P>
        Mitten im Spiel zählt, ob die offenen Felder 63 mit normalen Ergebnissen noch schaffen. Hier sind Einser bis
        Vierer eingetragen, alles andere ist offen:
      </P>
      <Table
        head={["Summe oben (Soll 30)", "26", "28", "30", "34", "36"]}
        numeric={[1, 2, 3, 4, 5]}
        rows={[
          ["Erwarteter Rest", "189,3", "189,3", best("200,2"), "202,0", "209,3"],
          ["Fehlt aus Fünfern und Sechsern", "37", "35", "33", "29", "27"],
        ]}
      />
      <Callout>
        Zwei unter Soll ist <b>nicht mehr wert</b> als vier unter Soll, das Soll zu erreichen aber 11 Punkte. Liegst
        du zurück, bringt ein Eintrag, der die Lücke nur verkleinert, wenig. Einer, der dich zurück auf einen
        erreichbaren Weg bringt, bringt viel.
      </Callout>
      <H2>Wann du den Bonus aufgibst</H2>
      <P>
        Später, als es sich anfühlt. Mit 10 unter Soll und offenen Fünfern und Sechsern trägt der Solver drei Fünfen
        immer noch in Fünfer ein (mehr dazu in <A href={chapterHref("situationen")}>Gleiche Würfel, andere Karte</A>
        ). Gib erst auf, wenn jedes offene obere Feld vier oder mehr seiner Zahl bräuchte. Und streich nie ein oberes
        Feld, um ein unteres offen zu halten, solange der Bonus erreichbar ist.
      </P>
    </>
  );
}

function StrassenFullHouse() {
  return (
    <>
      <P>
        Die Straßen sind die verlässlichsten 70 Punkte auf der Karte. Ein Full House nimmst du gern mit, wenn es
        kommt, aber früh lohnt es sich selten, darauf zu spielen.
      </P>
      <H2>Straßen</H2>
      <List>
        <li>
          <b>Hör nie mit einer Kleinen Straße auf, solange die Große offen ist.</b> Halte die vier in Folge und würfel
          den fünften Würfel neu: Die Kleine Straße kann dir nicht mehr entgehen. Auf leerer Karte bringt das bei 2 3
          4 5 5 mit einem Wurf übrig 5,0 Punkte mehr als sofort Kleine Straße einzutragen.
        </li>
        <li>
          <b>Offen schlägt einseitig.</b> 2345 wird mit einer 1 oder einer 6 zur Großen Straße, 1234 und 3456 nur mit
          einer Zahl. Im ersten Wurf schlägt 2345 ein Paar Fünfen, 1234 schlägt kein Paar Sechsen.
        </li>
        <li>
          <b>Straßen mit Lücke (1245, 2356) sind schwach.</b> 1 2 4 5 6 im ersten Wurf behältst du am besten als 2 4
          5, und das nur um 0,03 vor einer einzelnen 5. Behandle sie als nichts, solange noch anderes offen ist.
        </li>
        <li>
          <b>Ist die Große Straße eingetragen, ist die Kleine nur noch 30 Punkte.</b> Mit einem Wurf übrig nimmst du
          sie. Mit zwei Würfen übrig würfelt der Solver 1 2 3 4 5 sogar auf eine einzelne 5 zurück, aber nur um 0,4.
          Die 30 zu nehmen ist also in Ordnung.
        </li>
        <li>
          <b>Ist die Kleine Straße eingetragen, jag die Große nur aus einer offenen Vierer-Straße</b> (2345). Aus 3456
          oder 1234 im ersten Wurf ist ein einzelner hoher Würfel etwa gleich gut.
        </li>
      </List>
      <H2>Full House</H2>
      <List>
        <li>
          <b>Zwei Würfe übrig, hoher Drilling: aufbrechen.</b> Auf leerer Karte behältst du bei 6 6 6 5 5 und 4 4 4 x
          x nur den Drilling: Sechser oder Vierer mit vier oder fünf Würfeln ist mehr wert als jetzt 25. Das ganze
          Full House zu halten kostet bei 6 6 6 5 5 5,7 Punkte.
        </li>
        <li>
          <b>Niedriger Drilling (Einser, Zweier, Dreier): Full House spätestens nach dem zweiten Wurf nehmen.</b> 2 2
          2 3 3 mit einem Wurf übrig: aufhören und 25 eintragen. Ist das obere Feld des Drillings schon voll, hörst
          du sogar mit zwei Würfen übrig auf. Bei 3 3 3 6 6 mit eingetragenem Dreier bringt Aufhören 2,7 Punkte mehr
          als 3 3 3 zu halten.
        </li>
        <li>
          <b>Zwei Paare: nur eins halten, außer Full House ist fast alles, was dir bleibt.</b> Früh gewinnt das höhere
          Paar oder das Paar, dessen oberes Feld noch offen ist. Spät, wenn Full House eines deiner letzten offenen
          Felder ist, hältst du beide Paare: Der fünfte Würfel trifft mit 2 von 6 Zahlen, mit zwei Würfen in etwa 56
          % der Fälle.
        </li>
        <li>
          <b>Ein Kniffel zählt nach diesen Regeln nie als Full House.</b> 6 6 6 6 6 im Full House bringt 0 Punkte.
        </li>
      </List>
    </>
  );
}

function Kniffel() {
  return (
    <>
      <P>
        Ein offenes Kniffel-Feld ist auf leerer Karte etwa 21 Punkte wert: Streichst du es im ersten Zug, fällt der
        erwartete Endstand von 249,6 auf 228,2. Der größte Teil davon kommt spät im Spiel. Deshalb ist Kniffel auch
        das übliche Feld zum Streichen.
      </P>
      <List>
        <li>
          <b>Vier Gleiche: immer auf den fünften würfeln</b>, sogar bei vier Einsern. Auf leerer Karte schlägt bei 1 1
          1 1 6 mit zwei Würfen übrig das Halten von 1111 das Aufhören um 7,4 Punkte, mit einem Wurf übrig um 8,9.
        </li>
        <li>
          <b>Drei Gleiche: den Drilling halten, den Rest neu würfeln.</b> Einen Beistellwürfel dazu zu halten (6 6 6
          2 → 2 6 6 6) kostet mit einem Wurf übrig etwa 3,5 Punkte. Der Drilling arbeitet für das obere Feld, beide
          Pasch-Felder und Kniffel zugleich.
        </li>
        <li>
          <b>Spät im Spiel wird Kniffel zur kostenlosen Streichung.</b> Sind nur noch Kniffel und Chance offen und
          liegt nach dem letzten Wurf 6 6 6 1 2, sind Kniffel streichen und 21 in Chance gleich gut. Ist die Summe
          niedriger, streich Kniffel und heb Chance für einen besseren Wurf auf.
        </li>
      </List>
      <H2>Extra-Kniffel (+50 je Kniffel)</H2>
      <P>
        Den Extra-Bonus gibt es nur, wenn im Kniffel-Feld 50 stehen. Ein gestrichenes Kniffel-Feld verliert also auch
        jeden späteren Kniffel. Mit eingetragenem Kniffel ist der Rest eines frischen Spiels noch 247,2 Punkte wert,
        zusätzlich zu den 50.
      </P>
      <P>
        Ein Extra-Kniffel muss in sein oberes Feld, falls es offen ist, sonst in 3er-Pasch, 4er-Pasch oder Chance.
        Unter diesen ist die Reihenfolge des Solvers:
      </P>
      <List ordered>
        <li>
          <b>Sein oberes Feld</b>, wenn offen. 5 5 5 5 5 in Fünfer ist 13,6 Punkte mehr wert als im 4er-Pasch, weil
          25 in Fünfer den Bonus fast sichert.
        </li>
        <li>
          <b>4er-Pasch</b>, das schwerste Pasch-Feld.
        </li>
        <li>
          <b>3er-Pasch.</b>
        </li>
        <li>
          <b>Chance</b>, zuletzt.
        </li>
      </List>
      <P>
        Sind alle vier passenden Felder voll, streichst du ein beliebiges Feld und bekommst die 50 trotzdem. Nimm das
        Feld, das du am wenigsten wahrscheinlich noch füllst, zuerst Einser.
      </P>
    </>
  );
}

function Streichen() {
  return (
    <>
      <P>
        Früh im Spiel geht ein Fehlwurf in Einser oder Chance. Ab der Spielmitte geht er zuerst in Kniffel, dann in
        4er-Pasch, dann Full House, dann Große Straße.
      </P>
      <Table
        head={["Spielphase", "Fehlwurf", "Bester Eintrag", "Danach"]}
        rows={[
          ["Erster Zug, leere Karte", "1 2 3 5 6", best("Einser 1"), "Chance 17 (−2,8), Zweier 2, 4er-Pasch 0, Kniffel 0 (−7,3)"],
          ["Zug 3 (Sechser, Kleine Straße voll)", "2 3 4 6 6", best("Chance 21"), "Einser 0 (−4,4)"],
          ["Spielmitte (Einser, Vierer, Fünfer offen)", "1 2 3 5 6", best("Kniffel 0"), "Einser 1 (−0,2), 4er-Pasch 0 (−1,0), Full House 0 (−6,6)"],
          ["Spielmitte, gleiche Karte", "1 1 3 4 6", best("Einser 2"), "Kniffel 0 (−3,3)"],
          ["Spielmitte, gleiche Karte", "1 2 4 4 6", best("Vierer 8"), "Kniffel 0 (−0,7)"],
          ["Spät (5 Felder offen)", "1 2 3 5 6", best("Kniffel 0"), "4er-Pasch 0 (−1,7), Fünfer 5 (−4,8), Full House 0 (−6,5)"],
        ]}
      />
      <H2>Faustregeln daraus</H2>
      <List>
        <li>
          <b>Einser ist das billigste obere Feld zum Verfehlen.</b> Eine kurze Einser kostet höchstens 3 Punkte vom
          Soll, und die holt eine einzige zusätzliche 4, 5 oder 6 woanders zurück.
        </li>
        <li>
          <b>Chance früh nur für eine hohe Summe.</b> 21 im dritten Zug ist in Ordnung, 17 im ersten Zug ist
          schlechter als eine 1 in Einser.
        </li>
        <li>
          <b>Kniffel wird etwa zur Spielmitte die erste Streichung</b>, wenn rund die Hälfte der Karte voll ist. Die
          Chance auf einen Kniffel schrumpft mit jedem Zug.
        </li>
        <li>
          <b>Ein kurzes oberes Feld kann besser sein als eine Streichung.</b> Zwei Vieren in Vierer (4 unter Soll)
          schlagen das Streichen von Kniffel, solange der Bonus noch lebt.
        </li>
        <li>
          <b>Streich nie Kleine Straße oder Chance, solange es andere Wege gibt.</b> Perfektes Spiel füllt die Kleine
          Straße in 98 % der Spiele, und Chance hat nie 0.
        </li>
      </List>
    </>
  );
}

function Situationen() {
  return (
    <>
      <P>
        Der richtige Halt hängt von der Karte ab, nicht nur von den Würfeln. Jede Zeile ist ein Ergebnis des Solvers.
        <b> Vorsprung</b> sagt, um wie viele erwartete Punkte der beste Zug den nächstbesten schlägt.
      </P>
      <H2>Gleiche Würfel, andere Karte</H2>
      <Table
        head={["Karte", "Würfel (Würfe übrig)", "Bester Zug", "Vorsprung", "Warum"]}
        numeric={[3]}
        rows={[
          ["Leer", "5 5 6 6 3 (2)", best("6 6 halten"), "0,9", "Höheres Paar, beide oberen Felder offen"],
          ["Sechser voll", "5 5 6 6 3 (2)", best("5 5 halten"), "1,1", "Paar fürs offene obere Feld"],
          ["Fünfer und Sechser voll", "5 5 6 6 3 (2)", best("6 6 halten"), "1,1", "Jetzt zählt die Summe der Pasch-Felder"],
          ["Leer", "6 6 6 5 4 (1)", best("6 6 6 halten"), "2,8", "Zwei Würfel für Sechser mit 4+, 4er-Pasch, Kniffel"],
          ["Sechser voll", "6 6 6 5 4 (1)", best("6 6 6 halten"), "1,3", "Trotzdem würfeln: 3er-Pasch 27 jetzt kostet 2,6"],
        ]}
      />
      <H2>Hinten beim Bonus</H2>
      <P>
        Einser bis Vierer sind mit 20 eingetragen (10 unter Soll), Fünfer und Sechser sind offen, es fehlen 43 aus
        beiden:
      </P>
      <Table
        head={["Würfel (Würfe übrig)", "Bester Zug", "Vorsprung"]}
        rows={[
          ["5 5 5 1 2 (0)", best("Fünfer 15"), "3,7 vor 3er-Pasch 18"],
          ["5 5 5 1 2 (1)", best("5 5 5 halten und würfeln"), "2,8"],
        ]}
      />
      <P>
        Der Bonus ist bei 10 unter nicht tot: 4 Sechsen und 4 Fünfen schaffen ihn noch, und Einträge auf Soll halten
        diesen Weg offen. Auf Soll (30) schlägt dieselbe Fünfer 15 den 3er-Pasch sogar um 10,9. Ob hinten oder nicht:
        Drei Gleiche gehören nach oben.
      </P>
      <H2>Bonus schon sicher</H2>
      <P>
        Sind die 63 erreicht, werden offene obere Felder zu Abladefeldern. 1 2 3 5 6 geht in Einser 1 oder Zweier 2
        (0,5 auseinander), vor Chance 17 (−4,0) und Kniffel streichen (−4,7).
      </P>
      <H2>Letzter Zug: ein Feld übrig</H2>
      <Table
        head={["Letztes Feld", "Würfel (Würfe übrig)", "Bester Zug", "Erwartet"]}
        numeric={[3]}
        rows={[
          ["Chance", "6 6 4 3 2 (2)", best("6 6 halten, auch die 4 neu"), "24,8"],
          ["Chance", "6 6 4 3 2 (1)", best("4 6 6 halten"), "23,0"],
          ["Große Straße", "1 2 3 4 6 (2)", best("1234 oder 2346 halten (gleich)"), "12,2"],
          ["4er-Pasch", "6 6 6 1 4 (2)", best("6 6 6 halten"), "14,4"],
          ["3er-Pasch", "6 6 6 1 4 (1)", best("4 6 6 6 halten, die 1 neu"), "25,5"],
          ["3er-Pasch", "1 1 1 4 5 (1)", best("Aufhören: 12"), "12,0"],
          ["Sechser, 18 fehlen zum Bonus", "6 6 1 2 3 (2)", best("6 6 halten"), "40,8 mit Bonus"],
        ]}
      />
      <Callout>
        <b>Chance im letzten Zug:</b> Mit zwei Würfen übrig hältst du nur Fünfen und Sechsen, mit einem Wurf übrig
        auch die Vieren. Ein neu gewürfelter Würfel bringt mit einem Wurf übrig im Schnitt 3,5, mit zwei Würfen 4,25.
      </Callout>
      <H2>Gewohnheiten starker Spieler</H2>
      <List>
        <li>Zähl das Soll laut mit: „plus 3“ nach vier Fünfen, „minus 2“ nach zwei Dreien.</li>
        <li>Geh vor jedem Wurf die offenen Felder durch. Der beste Halt ergibt sich aus ihnen.</li>
        <li>Behalte lieber, was mehreren Feldern dient: Drei Sechsen arbeiten für Sechser, beide Pasch-Felder, Kniffel und Chance.</li>
        <li>Ist es knapp, nimm den Zug, der mehr Felder am Leben hält.</li>
      </List>
    </>
  );
}

function Turnier() {
  return (
    <>
      <P>
        Wertet ein Turnier die Gesamtpunkte über mehrere Spiele, spielst du genau wie in diesem Guide: Den
        erwarteten Endstand zu maximieren ist dann die beste Strategie. Erst wenn ein einzelnes Spiel den Sieger
        bestimmt, zählen die Punkte deiner Gegner.
      </P>
      <H2>Das Glück bleibt groß, auch bei perfektem Spiel</H2>
      <P>
        Ein Spiel streut um 46,6 Punkte (Standardabweichung). Über n Spiele streut dein Schnitt immer noch um 46,6
        geteilt durch die Wurzel aus n:
      </P>
      <Table
        head={["Gespielte Spiele", "1", "4", "10", "25", "100"]}
        numeric={[1, 2, 3, 4, 5]}
        rows={[["Typische Streuung deines Schnitts (± Punkte)", "46,6", "23,3", "14,7", "9,3", "4,7"]]}
      />
      <P>
        Wer gegenüber dem Solver 5 Punkte pro Spiel verschenkt, braucht mehrere hundert Spiele, bis der Unterschied
        sicher sichtbar wird. Jakub Pawlewicz kommt in seiner Arbeit zu Yahtzee mit mehreren Spielern zum selben
        Schluss: Der Vorsprung optimalen Spiels vor gutem Spiel ist klein, das Spiel ist zum großen Teil Glück.
      </P>
      <H2>Gegen einen Gegner in einem Spiel</H2>
      <P>
        Willst du einen Gegner in einem einzelnen Spiel schlagen, liegt die Strategie für den besten Schnitt nah am
        Optimum. Mit diesen Anpassungen (Faustregeln, keine Solver-Ergebnisse):
      </P>
      <List>
        <li>
          <b>Spät weit hinten:</b> Geh ins Risiko. Jag weiter Kniffel und Große Straße, gib den Bonus auf, wenn er nur
          ein paar Punkte rettet, und nutz Chance und die Pasch-Felder nur für große Summen.
        </li>
        <li>
          <b>Spät weit vorn:</b> Nimm Risiko raus. Nimm das sichere Full House oder die Straße, sichere den Bonus auch
          für einen kleinen Preis und streich Kniffel früh.
        </li>
        <li>
          <b>Knappes Spiel:</b> Spiel auf den besten Schnitt. Die Anpassungen lohnen sich nur, wenn der Abstand groß
          ist im Vergleich zu dem, was noch zu holen ist.
        </li>
        <li>
          <b>Achte auf die offenen Felder deines Gegners.</b> Wer Kniffel und Große Straße noch offen hat, kann bis zu
          90 Punkte aufholen. Wer beide gestrichen hat, nicht.
        </li>
      </List>
      <H2>Quellen</H2>
      <List>
        <li>
          <b>Solver und Simulation:</b> der exakte Solver der Würfelkarte (
          <A href="https://github.com/sndjan/wuerfelkarte/blob/main/src/games/yatzy/solver.ts">src/games/yatzy/solver.ts</A>
          ), berechnet durch Rückwärtsinduktion über alle Zustände der Karte, dazu eine Simulation von 100.000
          Solver-Spielen vom 30. Oktober 2026.
        </li>
        <li>
          <b>Regeln:</b> Schmidt Spiele,{" "}
          <A href="https://schmidtspiele.de/files/Retail/pdf/51203_M-Kniffel_DE.pdf">Kniffel-Anleitung mit der Meisterschaftsregel</A>.
        </li>
        <li>
          <b>Vergleich mit Yahtzee:</b> Tom Verhoeff,{" "}
          <A href="https://www-set.win.tue.nl/~wstomv/misc/yahtzee/disclaimers.html">Optimal Solitaire Yahtzee Player</A>{" "}
          (254,59 Punkte erwartet).
        </li>
        <li>
          <b>Mehrere Spieler:</b> Jakub Pawlewicz,{" "}
          <A href="https://www.springerprofessional.de/nearly-optimal-computer-play-in-multi-player-yahtzee/3584136">
            Nearly Optimal Computer Play in Multi-player Yahtzee
          </A>{" "}
          (Computers and Games 2010) und seine{" "}
          <A href="https://mimuw.edu.pl/media/uploads/doctorates/thesis-jakub-pawlewicz.pdf">Doktorarbeit</A>.
        </li>
      </List>
    </>
  );
}

export const chapterContent: Record<string, () => ReactNode> = {
  regeln: Regeln,
  "perfektes-spiel": PerfektesSpiel,
  grundregeln: Grundregeln,
  "erster-wurf": ErsterWurf,
  "oberer-block": ObererBlock,
  "strassen-full-house": StrassenFullHouse,
  kniffel: Kniffel,
  streichen: Streichen,
  situationen: Situationen,
  turnier: Turnier,
};
