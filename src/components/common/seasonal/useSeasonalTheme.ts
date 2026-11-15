"use client";

import { useEffect, useState } from "react";

import { THEME_ACTIVE_KEY } from "@/games/shared/migrations";

/**
 * The seasonal decorations the app knows. The three holidays come first; the
 * four seasons fill the rest of the year, so "none" only remains for a date
 * no window covers (none today).
 */
export type Theme =
  | "none"
  | "Halloween"
  | "Christmas"
  | "Easter"
  | "Winter"
  | "Spring"
  | "Summer"
  | "Autumn";

/** Holidays get their own Wunder animation; the seasons play the dice. */
export const HOLIDAYS = ["Halloween", "Christmas", "Easter"] as const;
export type Holiday = (typeof HOLIDAYS)[number];
export const isHoliday = (theme: Theme): theme is Holiday => (HOLIDAYS as readonly string[]).includes(theme);

export const THEME_EMOJIS: Record<Theme, string[]> = {
  Halloween: ["🎃", "👻", "🍬"],
  Christmas: ["🎄", "🎁", "⛄"],
  Easter: ["🐰", "🥚", "🥕"],
  Winter: ["❄️", "⛄", "☕"],
  Spring: ["🌸", "🐞", "🦋"],
  Summer: ["☀️", "🍦", "😎"],
  Autumn: ["🍁", "🍄", "🌰"],
  none: ["⭐", "🎲"],
};

/** The three own drawings per season (public/images/saison), back to front. */
export const THEME_MOTIFS: Record<Exclude<Theme, "none">, [string, string, string]> = {
  Winter: ["schneeflocke", "kakao", "schneemann"],
  Spring: ["schmetterling", "marienkaefer", "bluete"],
  Easter: ["osterei", "moehre", "hase"],
  Summer: ["sonne", "eis", "wuerfel-sonnenbrille"],
  Autumn: ["blatt", "eichel", "pilz"],
  Halloween: ["geist", "bonbon", "kuerbis"],
  Christmas: ["tanne", "geschenk", "wuerfel-muetze"],
};

/** Inclusive date windows, checked in order; Christmas deliberately wraps across new year. */
const SEASONS: Array<{
  theme: Theme;
  /** [month, day], month 1-based. */
  start: [number, number];
  end: [number, number];
}> = [
  { theme: "Halloween", start: [10, 20], end: [11, 2] },
  { theme: "Christmas", start: [11, 20], end: [1, 10] },
  { theme: "Easter", start: [3, 22], end: [4, 12] },
  { theme: "Winter", start: [1, 11], end: [2, 29] },
  { theme: "Spring", start: [3, 1], end: [5, 31] },
  { theme: "Summer", start: [6, 1], end: [8, 31] },
  { theme: "Autumn", start: [9, 1], end: [11, 19] },
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
