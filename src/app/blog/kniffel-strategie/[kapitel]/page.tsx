import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GUIDE_TITLE, guideChapters } from "@/blog/kniffel-strategie/chapters";
import { GuideChapterPage } from "@/blog/kniffel-strategie/GuideChapterPage";

type Props = { params: Promise<{ kapitel: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return guideChapters.map((chapter) => ({ kapitel: chapter.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kapitel } = await params;
  const chapter = guideChapters.find((c) => c.slug === kapitel);
  if (!chapter) return {};
  return {
    title: `${chapter.title} – ${GUIDE_TITLE}`,
    description: chapter.description,
    openGraph: { type: "article", title: chapter.title, description: chapter.description },
  };
}

export default async function KapitelPage({ params }: Props) {
  const { kapitel } = await params;
  if (!guideChapters.some((c) => c.slug === kapitel)) notFound();
  return <GuideChapterPage slug={kapitel} />;
}
