import ChristmasTheme from "./ChristmasTheme";
import EasterTheme from "./EasterTheme";
import HalloweenTheme from "./HalloweenTheme";
import type { Theme } from "./useSeasonalTheme";

type ThemeManagerProps = {
  theme: Theme;
  isThemeActive: boolean;
  /**
   * Drops the large centre-piece decoration. Yatzy's narrow MiniWunder cards
   * have no room for it.
   */
  compact?: boolean;
};

/** Renders the decoration for the running season, behind whatever it wraps. */
export default function ThemeManager({
  theme,
  isThemeActive,
  compact = false,
}: ThemeManagerProps) {
  if (!isThemeActive) return null;

  return (
    <>
      {theme === "Halloween" && <HalloweenTheme compact={compact} />}
      {theme === "Christmas" && <ChristmasTheme compact={compact} />}
      {theme === "Easter" && <EasterTheme compact={compact} />}
    </>
  );
}
