import { Theme } from "@/app/[gamemode]/page";
import { useEffect, useState } from "react";

export const THEME_EMOJIS: Record<Theme, string[]> = {
  Halloween: ["🎃", "👻", "🍬"],
  Christmas: ["🎄", "🎁", "⛄"],
  Easter: ["🐰", "🥚", "🌷"],
  none: ["⭐", "🎲"],
};

const DATES = {
  Halloween: {
    start: { day: 27, month: 9 },
    end: { day: 2, month: 10 },
  },
  Christmas: {
    start: { day: 20, month: 11 },
    end: { day: 10, month: 1 },
  },
  Easter: {
    start: { day: 22, month: 3 },
    end: { day: 12, month: 4 },
  },
};

const isDateInRange = (
  startDay: number,
  startMonth: number,
  endDay: number,
  endMonth: number,
): boolean => {
  const now = new Date();
  const dateKey = (d: Date) => (d.getMonth() + 1) * 100 + d.getDate();
  const key = dateKey(now);
  const start = startMonth * 100 + startDay;
  const end = endMonth * 100 + endDay;
  // handle ranges that wrap across year boundary
  return start <= end ? key >= start && key <= end : key >= start || key <= end;
};

const getTheme = () => {
  if (
    isDateInRange(
      DATES.Halloween.start.day,
      DATES.Halloween.start.month,
      DATES.Halloween.end.day,
      DATES.Halloween.end.month,
    )
  ) {
    return "Halloween";
  } else if (
    isDateInRange(
      DATES.Christmas.start.day,
      DATES.Christmas.start.month,
      DATES.Christmas.end.day,
      DATES.Christmas.end.month,
    )
  ) {
    return "Christmas";
  } else if (
    isDateInRange(
      DATES.Easter.start.day,
      DATES.Easter.start.month,
      DATES.Easter.end.day,
      DATES.Easter.end.month,
    )
  ) {
    return "Easter";
  } else {
    return "none";
  }
};

export const useTheme = () => {
  const [theme] = useState<Theme>(getTheme());
  const [isThemeActive, setIsThemeActive] = useState<boolean>();

  // load persisted value on mount (safe for SSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kniffel:isThemeActive");
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
      localStorage.setItem(
        "kniffel:isThemeActive",
        JSON.stringify(isThemeActive),
      );
    } catch {
      console.warn("Could not persist theme preference");
    }
  }, [isThemeActive]);

  return { theme, isThemeActive, setIsThemeActive };
};
