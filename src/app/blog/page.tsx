import type { Metadata } from "next";

import { BlogIndex } from "@/blog/components/BlogIndex";

export const metadata: Metadata = {
  title: "Blog",
  description: "Strategie, Regeln und Hintergründe zu Kniffel und den anderen Spielen der Würfelkarte.",
};

export default function BlogPage() {
  return <BlogIndex />;
}
