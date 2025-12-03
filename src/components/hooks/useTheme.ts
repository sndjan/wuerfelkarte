import { Theme } from "@/app/[gamemode]/page";
import { useEffect, useState } from "react";

const isDateInRange = (
  startDay: number,
  startMonth: number,
  endDay: number,
  endMonth: number
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
  if (isDateInRange(27, 9, 2, 10)) {
    return "Halloween";
  } else if (isDateInRange(20, 11, 6, 0)) {
    return "Christmas";
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
        JSON.stringify(isThemeActive)
      );
    } catch {
      console.warn("Could not persist theme preference");
    }
  }, [isThemeActive]);

  return { theme, isThemeActive, setIsThemeActive };
};
