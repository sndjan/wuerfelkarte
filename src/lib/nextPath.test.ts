import { describe, expect, it } from "vitest";
import { safeNextPath } from "./nextPath";

describe("safeNextPath", () => {
  it("allows paths inside the app", () => {
    expect(safeNextPath("/yatzy")).toBe("/yatzy");
  });

  it("falls back for anything that could leave the site", () => {
    for (const value of [null, "", "https://evil.example", "//evil.example", "/\\evil.example"]) {
      expect(safeNextPath(value)).toBe("/konto");
    }
  });
});
