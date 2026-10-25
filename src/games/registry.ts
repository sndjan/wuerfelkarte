/**
 * Every game the app knows about — the single source for the overview page.
 *
 * Locked entries are the ones on the roadmap: they render as a tile with a
 * "Bald" badge and need nothing else. Adding a playable game means adding its
 * folder under `src/games/` and flipping `locked` off here.
 */
export type GameSummary = {
  /** Also the route segment: `/yatzy`, `/wizard`, … */
  key: string;
  name: string;
  emoji: string;
  href?: string;
  locked: boolean;
  /** Names people also search for; kept for a future search box. */
  alternativeNames?: string[];
  /** Shown first on the home page with its own wide tile (the daily quiz). */
  featured?: boolean;
};

export const games: GameSummary[] = [
  {
    key: "quiz",
    name: "Kniffel-Quiz",
    emoji: "🧠",
    href: "/quiz",
    locked: false,
    featured: true,
    alternativeNames: ["Tagesquiz", "Yatzy-Quiz", "Kniffel-Trainer"],
  },
  {
    key: "yatzy",
    name: "Yatzy",
    emoji: "🎲",
    href: "/yatzy",
    locked: false,
    alternativeNames: ["Kniffel", "Yahtzee"],
  },
  { key: "wizard", name: "Wizard", emoji: "🧙‍♂️", href: "/wizard", locked: false },
  { key: "flip7", name: "Flip 7", emoji: "7️⃣", href: "/flip7", locked: false },
  { key: "cabo", name: "Cabo", emoji: "🃏", href: "/cabo", locked: false },
  {
    key: "darts",
    name: "Darts",
    emoji: "🎯",
    href: "/darts",
    locked: false,
    alternativeNames: ["Dart", "501", "X01"],
  },
  { key: "skullking", name: "Skull King", emoji: "💀", locked: true },
  { key: "uno", name: "Uno", emoji: "🃏", locked: true },
  {
    key: "mäxle",
    name: "Mäxle",
    emoji: "🎲",
    locked: true,
    alternativeNames: ["Mäxchen", "Meiern"],
  },
  {
    key: "schwimmen",
    name: "Schwimmen",
    emoji: "🃏",
    locked: true,
    alternativeNames: ["31"],
  },
];

export const playableGames = games.filter((game) => !game.locked);
