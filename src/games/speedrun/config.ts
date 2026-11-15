import type { SpeedrunCategory } from "./types";

export const SPEEDRUN_EMOJI = "⏱️";
export const SPEEDRUN_NAME = "Speedrun";

/** Penalty per expected point a decision gives away. */
export const STRAFE_MS_PER_POINT = 1000;

/**
 * The categories a new run can be started in. Any% and the Tagesrun are no
 * longer offered; their stored runs and a run still on the clock stay valid.
 */
export const CATEGORIES: SpeedrunCategory[] = ["classic"];

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

/** "1:31,234" — minutes, seconds and milliseconds. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")},${String(total % 1000).padStart(3, "0")}`;
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
