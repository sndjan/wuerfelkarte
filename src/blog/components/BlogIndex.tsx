import { ChevronRight, Clock } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/common/PageHeader";
import { blogHref, blogPosts, formatPublished } from "../posts";

/** /blog: every article as a card, newest first. */
export function BlogIndex() {
  return (
    <div className="wk min-h-full bg-background">
      <PageHeader backHref="/" title="Blog" />
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-10 md:max-w-2xl md:px-8">
        {blogPosts.map((post) => (
          <Link key={post.slug} href={blogHref(post.slug)} className="wk-card">
            <p className="wkx-kicker">{post.kicker}</p>
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="wk-card-title">{post.title}</h2>
                <p className="wk-hint">{post.description}</p>
              </div>
              <ChevronRight className="mt-1 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
            </div>
            <div className="wkx-meta">
              <span>
                <Clock className="size-4" aria-hidden="true" />
                {post.readingMinutes} Min. Lesezeit
              </span>
              <span>{formatPublished(post.published)}</span>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}
