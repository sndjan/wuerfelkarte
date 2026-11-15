import Snowfall from "react-snowfall";

import { THEME_MOTIFS, type Theme } from "./useSeasonalTheme";

type ThemeManagerProps = {
  theme: Theme;
  isThemeActive: boolean;
  /** Drops the large motif bottom right, where a narrow card has no room for it. */
  compact?: boolean;
};

const SPOTS = [
  "right-[-34px] top-[-28px] size-[132px] rotate-[14deg]",
  "left-[-28px] bottom-[18%] size-[168px] -rotate-[16deg]",
  "right-[-36px] bottom-[-24px] size-[188px] rotate-[12deg]",
];

/**
 * Renders the season's three motifs behind whatever it wraps: small top
 * right, larger in the free corners below, never behind the fields. The
 * drawings are the app's own (public/images/saison). The host must be
 * `relative isolate`: the layer sits at `-z-10`, so it paints above the
 * host's background but below all of its content, and never takes input.
 */
export default function ThemeManager({ theme, isThemeActive, compact = false }: ThemeManagerProps) {
  if (!isThemeActive || theme === "none") return null;
  const motifs = THEME_MOTIFS[theme];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none">
      {motifs.map((motif, i) =>
        compact && i === 2 ? null : (
          // eslint-disable-next-line @next/next/no-img-element -- small static SVGs, nothing to optimise
          <img key={motif} src={`/images/saison/${motif}.svg`} alt="" className={`absolute opacity-90 ${SPOTS[i]}`} />
        ),
      )}
      {(theme === "Christmas" || theme === "Winter") && (
        <div className="absolute inset-0">
          <Snowfall snowflakeCount={20} radius={[1, 4]} />
        </div>
      )}
    </div>
  );
}
