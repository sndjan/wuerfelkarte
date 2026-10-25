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

/**
 * Renders the decoration for the running season, behind whatever it wraps.
 * The host must be `relative isolate`: the layer sits at `-z-10`, so it paints
 * above the host's background but below all of its content, and never takes
 * input.
 */
export default function ThemeManager({
  theme,
  isThemeActive,
  compact = false,
}: ThemeManagerProps) {
  if (!isThemeActive) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
    >
      {theme === "Halloween" && <HalloweenTheme compact={compact} />}
      {theme === "Christmas" && <ChristmasTheme compact={compact} />}
      {theme === "Easter" && <EasterTheme compact={compact} />}
    </div>
  );
}
