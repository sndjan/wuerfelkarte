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
};

export const games: GameSummary[] = [
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
  { key: "cabo", name: "Cabo", emoji: "🃏", locked: true },
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
