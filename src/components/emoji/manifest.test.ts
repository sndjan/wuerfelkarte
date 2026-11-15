import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { THEME_EMOJIS } from "@/components/common/seasonal/useSeasonalTheme";
import { games } from "@/games/registry";
import { EMOJI_OPTIONS } from "@/games/shared/types";

import { NOTO_EMOJI } from "./manifest";
import { notoEntry } from "./player";

const publicDir = path.resolve(__dirname, "../../../public/emoji");

describe("Noto emoji", () => {
  it("finds an emoji with or without its variation selector", () => {
    expect(notoEntry("⏱️")).toEqual(notoEntry("⏱"));
    expect(notoEntry("🧙‍♂️")?.k).toBe("1f9d9_200d_2642");
    expect(notoEntry("x")).toBeUndefined();
  });

  it("has a drawing for every character, game and season emoji", () => {
    const used = [...EMOJI_OPTIONS, ...games.map((g) => g.emoji), ...Object.values(THEME_EMOJIS).flat()];
    expect(used.filter((e) => !notoEntry(e))).toEqual([]);
  });

  it("ships every file the manifest names", () => {
    const missing = Object.values(NOTO_EMOJI).flatMap(({ k, a }) =>
      [`${k}.svg`, ...(a ? [`${k}.json`] : [])].filter((f) => !fs.existsSync(path.join(publicDir, f))),
    );
    expect(missing).toEqual([]);
  });
});
