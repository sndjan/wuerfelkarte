import { describe, expect, it } from "vitest";
import { safeNextPath } from "./nextPath";

describe("safeNextPath", () => {
  it("allows paths inside the app", () => {
    expect(safeNextPath("/yatzy")).toBe("/yatzy");
    expect(safeNextPath("/online/abc?x=1#y")).toBe("/online/abc?x=1#y");
  });

  it("falls back for anything that could leave the site", () => {
    for (const value of [null, "", "https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "/a\\..\\/evil.example"]) {
      expect(safeNextPath(value)).toBe("/konto");
    }
  });
});
