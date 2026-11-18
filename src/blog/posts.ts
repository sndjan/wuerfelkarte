/**
 * The blog: articles about the games, written once as React content under
 * `src/blog/<slug>/` and listed here for /blog. Newest first.
 */

export type BlogPost = {
  slug: string;
  title: string;
  /** One or two sentences: the card on /blog and the page's meta description. */
  description: string;
  kicker: string;
  /** YYYY-MM-DD. */
  published: string;
  readingMinutes: number;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "kniffel-strategie",
    title: "So spielst du Kniffel wie der Solver",
    description:
      "Was perfektes Spiel bringt und welche Faustregeln fast alles davon holen: behalten, eintragen, streichen und der 35er-Bonus, mit Zahlen aus dem exakten Solver.",
    kicker: "Guide · Meisterschaftsregel",
    published: "2026-11-18",
    readingMinutes: 15,
  },
];

export const blogHref = (slug: string) => `/blog/${slug}`;

/** "18. November 2026" */
export const formatPublished = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
