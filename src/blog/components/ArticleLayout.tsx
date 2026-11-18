import { Clock } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { type BlogPost, formatPublished } from "../posts";
import { ShareButton } from "./ShareButton";

/** A blog article on one page: header, title, meta line, text. */
export function ArticleLayout({ post, children }: { post: BlogPost; children: ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    inLanguage: "de",
  };
  return (
    <div className="wk min-h-full bg-background">
      <PageHeader backHref="/blog" title="Blog" right={<ShareButton title={post.title} />} />
      <article className="wkx-article mx-auto max-w-md px-4 pt-2 pb-10 md:max-w-2xl md:px-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <p className="wkx-kicker">{post.kicker}</p>
        <h1 className="wkx-h1">{post.title}</h1>
        <div className="wkx-meta">
          <span>
            <Clock className="size-4" aria-hidden="true" />
            {post.readingMinutes} Min. Lesezeit
          </span>
          <span>{formatPublished(post.published)}</span>
        </div>
        {children}
      </article>
    </div>
  );
}
