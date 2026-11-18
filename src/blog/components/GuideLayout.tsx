import { ListOrdered } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";
import { GUIDE_TITLE, chapterHref, guideChapters, guideHref } from "../kniffel-strategie/chapters";
import { ShareButton } from "./ShareButton";

/** The guide's chapters as a list; the open one is marked. */
export function GuideToc({ current, small = false }: { current?: string; small?: boolean }) {
  return (
    <nav className={cn("wkx-toc", small && "wkx-toc-sm")} aria-label="Inhalt">
      {guideChapters.map((chapter, i) => (
        <Link
          key={chapter.slug}
          href={chapterHref(chapter.slug)}
          aria-current={chapter.slug === current ? "page" : undefined}
        >
          <span className="wkx-toc-num">{i + 1}</span>
          <span>{chapter.title}</span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Every page of the Kniffel guide: header with contents and share, the
 * reading progress, and on wide screens the contents beside the text.
 */
export function GuideLayout({
  current,
  progress,
  children,
}: {
  /** The open chapter's slug; none on the guide's start page. */
  current?: string;
  /** 0–1, how far through the guide this page is. */
  progress: number;
  children: ReactNode;
}) {
  return (
    <div className="wk min-h-full bg-background">
      <PageHeader
        backHref="/blog"
        title={GUIDE_TITLE}
        right={
          <>
            {current && (
              <Link href={`${guideHref}#inhalt`} className="wk-iconbtn md:hidden" aria-label="Inhalt">
                <ListOrdered className="size-5" aria-hidden="true" />
              </Link>
            )}
            <ShareButton title={GUIDE_TITLE} />
          </>
        }
      />
      <div className="wkx-readbar" role="presentation">
        <i style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div
        className={cn(
          "mx-auto flex max-w-md flex-col gap-6 px-4 pt-6 pb-10 md:px-8",
          current ? "md:max-w-[1180px] md:flex-row md:items-start md:gap-12" : "md:max-w-2xl",
        )}
      >
        {current && (
          <aside className="hidden w-[300px] shrink-0 flex-col gap-3 md:flex">
            <p className="wkx-kicker">{GUIDE_TITLE}</p>
            <GuideToc current={current} small />
            <div className="wk-card gap-2">
              <p className="wk-overline">Üben</p>
              <p className="wk-hint">Spiel eine Runde im Training und vergleich jeden Zug mit dem Solver.</p>
              <Link className="wk-btn wk-btn-primary wk-btn-sm" href="/training">
                Training starten
              </Link>
            </div>
          </aside>
        )}
        <article className="wkx-article flex-1 md:max-w-[720px]">{children}</article>
      </div>
    </div>
  );
}
