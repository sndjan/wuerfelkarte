import type { SpeedrunCategory } from "./types";

export const SPEEDRUN_EMOJI = "⏱️";
export const SPEEDRUN_NAME = "Kniffel-Speedrun";

/** Penalty per expected point a decision gives away. */
export const STRAFE_MS_PER_POINT = 1000;

export const CATEGORIES: SpeedrunCategory[] = ["any", "classic", "daily"];

export const CATEGORY_LABELS: Record<SpeedrunCategory, string> = {
  any: "Any%",
  classic: "Klassisch",
  daily: "Tagesrun",
};

export const CATEGORY_DESCRIPTIONS: Record<SpeedrunCategory, string> = {
  any: "Volle Karte, so schnell wie möglich. Nur die Zeit zählt.",
  classic:
    "Volle Karte, so schnell wie möglich. Jeder Punkt, den ein Zug laut Solver verschenkt, kostet eine Sekunde. Die Punkte auf der Karte zählen nicht – Glück hilft dir nicht.",
  daily:
    "Heute würfeln alle dieselben Würfel. Zeit plus eine Sekunde pro verschenktem Punkt – der erste Lauf des Tages zählt für den Vergleich.",
};

/** "1:31,2" — minutes, seconds and tenths. */
export function formatTime(ms: number): string {
  const tenths = Math.max(0, Math.round(ms / 100));
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  return `${minutes}:${String(seconds).padStart(2, "0")},${tenths % 10}`;
}

/** "12,6" — seconds with one decimal, for penalties. */
export const formatSeconds = (ms: number) =>
  (Math.round(ms / 100) / 10).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/** "−1,2" / "+0,8" — a difference in seconds, with a real minus sign. */
export const formatDelta = (ms: number) =>
  `${ms < 0 ? "−" : "+"}${formatSeconds(Math.abs(ms))}`;
