import type { Metadata } from "next";

import { GuideStart } from "@/blog/kniffel-strategie/GuideStart";
import { blogPosts } from "@/blog/posts";

const post = blogPosts.find((p) => p.slug === "kniffel-strategie")!;

export const metadata: Metadata = {
  title: `${post.title} – Kniffel-Strategie`,
  description: post.description,
  openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.published },
};

export default function KniffelStrategiePage() {
  return <GuideStart />;
}
