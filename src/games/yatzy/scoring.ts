import { gamemodes } from "./gamemodes";
import { Points } from "./types";

/** Total of every numeric field in the mode, plus the upper-section bonus. */
export function calculateScore(
  points: Points,
  gamemode: keyof typeof gamemodes
): number {
  const config = gamemodes[gamemode];
  let bonus = 0;
  let sum = 0;
  if (config?.bonus) {
    sum = config.bonus.fields.reduce(
      (acc, key) =>
        acc +
        (typeof points[key as keyof typeof points] === "number"
          ? (points[key as keyof typeof points] as number)
          : 0),
      0
    );
    if (sum >= config.bonus.minSum) {
      bonus = config.bonus.bonus;
    }
  }
  const totalScore =
    config?.fields.reduce(
      (acc, { key }) =>
        acc +
        (typeof points[key as keyof typeof points] === "number"
          ? (points[key as keyof typeof points] as number)
          : 0),
      0
    ) + bonus;
  return totalScore;
}

/**
 * Whether every field is done: filled for everyone in normal modes, or —
 * in Battle — either claimed by someone or crossed out by everyone.
 */
export function isMatchComplete(
  players: { points: Points }[],
  gamemode: keyof typeof gamemodes
): boolean {
  const config = gamemodes[gamemode];
  const fields = config?.fields.map((f) => f.key) ?? [];
  if (players.length === 0 || fields.length === 0) return false;
  if (gamemode === "Battle") {
    return fields.every((key) => {
      const claimed = players.some((p) => {
        const v = p.points[key as keyof Points];
        return typeof v === "number" && v !== 0;
      });
      if (claimed) return true;
      return players.every((p) => p.points[key as keyof Points] === "X");
    });
  }
  return players.every((player) =>
    fields.every((key) => {
      const point = player.points[key as keyof Points];
      return point !== undefined && point !== 0;
    })
  );
}
