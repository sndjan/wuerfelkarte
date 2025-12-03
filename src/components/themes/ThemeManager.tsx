import ChristmasTheme from "./ChristmasTheme";
import HalloweenTheme from "./HalloweenTheme";
import { Theme } from "@/app/[gamemode]/page";

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
    </>
  );
}
