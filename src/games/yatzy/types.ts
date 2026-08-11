export type Player = {
  id: number;
  name: string;
  emoji?: string;
  points: Points;
  score: number; // final score including bonus
};

export type Points = {
  Einser: number | "X";
  Zweier: number | "X";
  Dreier: number | "X";
  Vierer: number | "X";
  Fünfer: number | "X";
  Sechser: number | "X";
  Dreierpasch: number | "X";
  Viererpasch: number | "X";
  "Full House": number | "X";
  "Kleine Straße": number | "X";
  "Große Straße": number | "X";
  Wunder: number | "X";
  Chance: number | "X";
};

/** A finished match's per-player record: the full sheet, not just the total. */
export type YatzyMatchPlayer = {
  name: string;
  emoji?: string;
  score: number;
  /** Absent on matches saved before this field existed. */
  points?: Points;
  /** Battle only: field keys that counted double for this player. */
  doubled?: string[];
};
