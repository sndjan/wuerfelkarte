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
