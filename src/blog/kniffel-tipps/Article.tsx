import Link from "next/link";

import { ArticleLayout } from "../components/ArticleLayout";
import { A, Callout, Examples, H2, P, Rules } from "../components/Blocks";
import { chapterHref, guideHref } from "../kniffel-strategie/chapters";
import { blogPosts } from "../posts";

export const KNIFFEL_TIPPS_SLUG = "kniffel-tipps";
const post = blogPosts.find((p) => p.slug === KNIFFEL_TIPPS_SLUG)!;

/** Ten plain tips for casual players: no figures beyond the game's own rules. */
export function KniffelTippsArticle() {
  return (
    <ArticleLayout post={post}>
      <p className="wkx-lede">
        Kniffel ist ein Glücksspiel, klar. Aber wer ein paar einfache Gewohnheiten hat, holt am Ende des Abends
        spürbar mehr Punkte raus. Hier sind zehn Tipps, die du dir sofort merken kannst.
      </p>

      <H2>1. Hol dir den Bonus</H2>
      <P>
        Der Bonus im oberen Block ist der größte Brocken, den du selbst in der Hand hast. Die Faustregel: Schaffst du
        bei jeder Zahl drei Würfel, hast du ihn sicher. Merk dir nach jedem Eintrag, ob du über oder unter diesem Plan
        liegst. Ein Feld mit vier Würfeln gleicht ein schwaches Feld woanders aus.
      </P>

      <H2>2. Drei Gleiche gehören nach oben</H2>
      <P>
        Hast du am Anfang des Spiels drei Gleiche, trag sie in ihr oberes Feld ein, zum Beispiel drei Fünfen in
        Fünfer. Das bringt dich dem Bonus näher als der 3er-Pasch. Den Pasch kannst du später noch füllen.
      </P>

      <H2>3. Behalte hohe Zahlen</H2>
      <P>
        Liegt nichts Besonderes, behalte Fünfen und Sechsen und würfel den Rest neu. Hohe Zahlen helfen fast überall:
        oben, in beiden Pasch-Feldern und in der Chance.
      </P>

      <H2>4. Zwei Paare? Nur eins behalten</H2>
      <P>
        Es fühlt sich falsch an, aber mit zwei Paaren behältst du am Anfang nur das höhere Paar und würfelst den Rest
        neu. So hast du die Chance auf drei oder vier Gleiche. Das Full House kommt oft trotzdem noch.
      </P>
      <Examples
        title="Beispiel"
        gainLabel={null}
        items={[{ dice: "66551", held: "11000", title: "Die Sechsen behalten, drei Würfel neu" }]}
      />

      <H2>5. Vier Gleiche: weiter auf Kniffel</H2>
      <P>
        Hast du vier Gleiche, würfel den letzten Würfel immer noch einmal. Ein Kniffel ist viel wert, und die vier
        Gleichen kannst du danach trotzdem eintragen. Das gilt sogar bei vier Einsern.
      </P>
      <Examples
        title="Beispiel"
        gainLabel={null}
        items={[{ dice: "44443", held: "11110", title: "Die Vieren halten und auf die fünfte würfeln" }]}
      />

      <H2>6. Straßen: vier in Folge reichen fürs Weiterwürfeln</H2>
      <P>
        Liegen vier Zahlen in Folge, hast du die Kleine Straße schon sicher. Ist die Große noch offen, würfel den
        fünften Würfel neu und versuch es. Am besten ist 2 3 4 5: Da passt sowohl eine 1 als auch eine 6.
      </P>

      <H2>7. Full House mitnehmen, nicht jagen</H2>
      <P>
        Ein Full House ist schön, wenn es von allein kommt. Früh im Spiel extra darauf zu spielen lohnt sich selten.
        Mit drei hohen Gleichen versuchst du lieber dein Glück im oberen Block.
      </P>

      <H2>8. Nutz alle drei Würfe</H2>
      <P>
        Hör nicht zu früh auf. Wenn du nicht gerade eine Große Straße, ein Full House für dein letztes Feld oder einen
        Kniffel hast, ist Weiterwürfeln fast immer richtig.
      </P>

      <H2>9. Die Chance ist dein Rettungsnetz</H2>
      <P>
        Heb dir die Chance für später auf, wenn ein Wurf danebengeht, aber eine hohe Summe zeigt. Wer sie früh mit
        einem mittelmäßigen Wurf füllt, hat später kein Netz mehr.
      </P>

      <H2>10. Streichen will gelernt sein</H2>
      <P>
        Manchmal passt nichts, und du musst eine Null eintragen. Früh im Spiel trifft es am besten die Einser: Da geht
        am wenigsten verloren. Ab der Mitte des Spiels streichst du lieber den Kniffel, denn mit jedem Zug wird er
        unwahrscheinlicher.
      </P>

      <H2>Zum Merken</H2>
      <Rules
        items={[
          { title: "Oben zählt", text: "Drei Würfel pro Zahl, dann kommt der Bonus." },
          { title: "Hoch und gleich behalten", text: "Fünfen, Sechsen und alles ab drei Gleichen." },
          { title: "Mutig weiterwürfeln", text: "Vier Gleiche, vier in Folge und fast jeder andere Wurf: noch mal." },
          { title: "Netz aufheben", text: "Chance für später, gestrichen wird früh Einser, später Kniffel." },
        ]}
      />

      <Callout>
        Auch mit den besten Tipps entscheidet an einem Abend oft das Glück. Ein schlechtes Spiel heißt nicht, dass du
        schlecht gespielt hast.
      </Callout>

      <H2>Wie geht es weiter?</H2>
      <P>
        Üben kannst du im <A href="/training">Kniffel-Training</A>: Dort siehst du nach jedem Zug, was der beste Zug
        gewesen wäre. Jeden Tag gibt es außerdem drei neue Aufgaben im <A href="/quiz">Kniffel-Quiz</A>. Und wer es
        genau wissen will, findet alle Hintergründe mit Zahlen im ausführlichen{" "}
        <A href={guideHref}>Kniffel-Strategie-Guide</A>, zum Beispiel zum{" "}
        <A href={chapterHref("oberer-block")}>Bonus im oberen Block</A>.
      </P>
      <Link className="wk-btn wk-btn-primary wk-btn-block" href="/training">
        Training starten
      </Link>
    </ArticleLayout>
  );
}
