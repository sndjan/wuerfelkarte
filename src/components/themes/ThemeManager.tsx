import ChristmasTheme from "./ChristmasTheme";
import EasterTheme from "./EasterTheme";
import HalloweenTheme from "./HalloweenTheme";
import { Theme } from "@/app/yatzy/[gamemode]/page";

type ThemeManagerProps = {
  gamemode: string;
  theme: Theme;
  isThemeActive: boolean;
};

export default function ThemeManager({
  gamemode,
  theme,
  isThemeActive,
}: ThemeManagerProps) {
  return (
    <>
      {theme === "Halloween" && isThemeActive && (
        <HalloweenTheme gamemode={gamemode} />
      )}

      {theme === "Christmas" && isThemeActive && (
        <ChristmasTheme gamemode={gamemode} />
      )}

      {theme === "Easter" && isThemeActive && (
        <EasterTheme gamemode={gamemode} />
      )}
    </>
  );
}
