import { ChapterNav } from "../components/ChapterNav";
import { GuideLayout } from "../components/GuideLayout";
import { GUIDE_TITLE, chapterHref, guideChapters, guideHref } from "./chapters";
import { chapterContent } from "./content";

/** One chapter: number, title, text, and the way back and on. */
export function GuideChapterPage({ slug }: { slug: string }) {
  const index = guideChapters.findIndex((c) => c.slug === slug);
  const chapter = guideChapters[index];
  const prev = guideChapters[index - 1];
  const next = guideChapters[index + 1];
  const Content = chapterContent[slug];

  return (
    <GuideLayout current={slug} progress={(index + 2) / (guideChapters.length + 1)}>
      <p className="wkx-kicker">
        Kapitel {index + 1} von {guideChapters.length}
      </p>
      <h1 className="wkx-h1">{chapter.title}</h1>
      <Content />
      <ChapterNav
        prev={prev ? { href: chapterHref(prev.slug), title: prev.title } : { href: guideHref, title: GUIDE_TITLE }}
        next={next && { href: chapterHref(next.slug), title: next.title }}
      />
    </GuideLayout>
  );
}
