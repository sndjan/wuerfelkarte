import { Clock } from "lucide-react";

import { Callout, Percentiles, Stats } from "../components/Blocks";
import { ChapterNav } from "../components/ChapterNav";
import { GuideLayout, GuideToc } from "../components/GuideLayout";
import { blogPosts, formatPublished } from "../posts";
import { chapterHref, guideChapters } from "./chapters";

const post = blogPosts.find((p) => p.slug === "kniffel-strategie")!;

/** The guide's first page: title, key figures, contents. */
export function GuideStart() {
  const first = guideChapters[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    inLanguage: "de",
  };
  return (
    <GuideLayout progress={1 / (guideChapters.length + 1)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="wkx-kicker">{post.kicker}</p>
      <h1 className="wkx-h1">{post.title}</h1>
      <p className="wkx-lede">
        Jede Zahl hier stammt aus dem exakten Solver der Würfelkarte, demselben, der dein Tagesquiz bewertet. Du
        erfährst, was perfektes Spiel bringt und welche Faustregeln fast alles davon holen.
      </p>
      <div className="wkx-meta">
        <span>
          <Clock className="size-4" aria-hidden="true" />
          {post.readingMinutes} Min. Lesezeit
        </span>
        <span>{formatPublished(post.published)}</span>
      </div>
      <Stats
        items={[
          ["249,6", "Ø perfekt"],
          ["68 %", "mit Bonus"],
          ["33 %", "mit Kniffel"],
        ]}
      />
      <section className="wk-section" id="inhalt">
        <h2 className="wk-overline">Inhalt</h2>
        <GuideToc />
      </section>
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
      <p className="wk-caption">Endstand bei perfektem Spiel, nach Perzentil</p>
      <Callout>
        Auch der Solver bleibt in etwa <b>1 von 7 Spielen unter 200</b>. Ein einzelnes Spiel sagt wenig über dein
        Können.
      </Callout>
      <ChapterNav next={{ href: chapterHref(first.slug), title: first.title }} />
    </GuideLayout>
  );
}
