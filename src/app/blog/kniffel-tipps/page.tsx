import type { Metadata } from "next";

import { KNIFFEL_TIPPS_SLUG, KniffelTippsArticle } from "@/blog/kniffel-tipps/Article";
import { blogPosts } from "@/blog/posts";

const post = blogPosts.find((p) => p.slug === KNIFFEL_TIPPS_SLUG)!;

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.published },
};

export default function KniffelTippsPage() {
  return <KniffelTippsArticle />;
}
