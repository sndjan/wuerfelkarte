"use client";

import { useEffect, useState } from "react";

import { THEME_ACTIVE_KEY } from "@/games/shared/migrations";

/** The seasonal decorations the app knows; "none" is the rest of the year. */
export type Theme = "none" | "Halloween" | "Christmas" | "Easter";

export const THEME_EMOJIS: Record<Theme, string[]> = {
  Halloween: ["🎃", "👻", "🍬"],
  Christmas: ["🎄", "🎁", "⛄"],
  Easter: ["🐰", "🥚", "🌷"],
  none: ["⭐", "🎲"],
};

/** Inclusive date windows; Christmas deliberately wraps across new year. */
const SEASONS: Array<{
  theme: Theme;
  /** [month, day], month 1-based. */
  start: [number, number];
  end: [number, number];
}> = [
  // NOTE: this window is what the app has always used, but it ends before
  // 31 October — the Halloween decoration never actually shows on Halloween.
  // Kept as-is deliberately; changing it is a product decision.
  { theme: "Halloween", start: [9, 27], end: [10, 2] },
  { theme: "Christmas", start: [11, 20], end: [1, 10] },
  { theme: "Easter", start: [3, 22], end: [4, 12] },
];

const dateKey = (month: number, day: number) => month * 100 + day;

const inRange = (
  date: Date,
  [startMonth, startDay]: [number, number],
  [endMonth, endDay]: [number, number],
): boolean => {
  const key = dateKey(date.getMonth() + 1, date.getDate());
  const start = dateKey(startMonth, startDay);
  const end = dateKey(endMonth, endDay);
  return start <= end ? key >= start && key <= end : key >= start || key <= end;
};

/** Which decoration a given day falls into — "none" for most of the year. */
export const seasonFor = (date: Date = new Date()): Theme =>
  SEASONS.find((season) => inRange(date, season.start, season.end))?.theme ??
  "none";

export const useSeasonalTheme = () => {
  const [theme] = useState<Theme>(() => seasonFor());
  const [isThemeActive, setIsThemeActive] = useState<boolean>();

  // load persisted value on mount (safe for SSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(THEME_ACTIVE_KEY);
      if (raw !== null) {
        setIsThemeActive(JSON.parse(raw));
      } else {
        setIsThemeActive(true);
      }
    } catch {
      console.warn("Could not load theme preference");
    }
  }, []);

  // persist changes
  useEffect(() => {
    try {
      localStorage.setItem(THEME_ACTIVE_KEY, JSON.stringify(isThemeActive));
    } catch {
      console.warn("Could not persist theme preference");
    }
  }, [isThemeActive]);

  return { theme, isThemeActive, setIsThemeActive };
};
