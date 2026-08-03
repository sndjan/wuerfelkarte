export type GameEntry = {
  key: string;
  name: string;
  emoji: string;
  href?: string;
  locked: boolean;
  alternativeNames?: string[];
};

export const games: GameEntry[] = [
  { key: "yatzy", name: "Yatzy", emoji: "🎲", href: "/yatzy", locked: false, alternativeNames: ["Kniffel", "Yahtzee"] },
  { key: "wizard", name: "Wizard", emoji: "🧙‍♂️", href: "/wizard", locked: false },
  { key: "flip7", name: "Flip 7", emoji: "7️⃣", href: "/flip7", locked: false },
  { key: "cabo", name: "Cabo", emoji: "🃏", locked: true },
  { key: "skullking", name: "Skull King", emoji: "💀", locked: true },
  { key: "uno", name: "Uno", emoji: "🃏", locked: true },
  { key: "mäxle", name: "Mäxle", emoji: "🎲", locked: true, alternativeNames: ["Mäxchen", "Meiern"] },
  { key: "schwimmen", name: "Schwimmen", emoji: "🃏", locked: true, alternativeNames: ["31"] },
  
];
