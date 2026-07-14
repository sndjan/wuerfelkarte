export type GameEntry = {
  key: string;
  name: string;
  emoji: string;
  href?: string;
  locked: boolean;
};

export const games: GameEntry[] = [
  { key: "yatzy", name: "Yatzy", emoji: "🎲", href: "/yatzy", locked: false },
  { key: "wizard", name: "Wizard", emoji: "🧙‍♂️", locked: true },
  { key: "cabo", name: "Cabo", emoji: "🃏", locked: true },
  { key: "skullking", name: "Skull King", emoji: "💀", locked: true },
];
