import { describe, expect, it } from "vitest";

import { missingEntries } from "./turns";

describe("missingEntries", () => {
  it("finds nothing in a regular round", () => {
    expect(missingEntries([8, 8, 7])).toEqual([0, 0, 0]);
    expect(missingEntries([7, 7, 7])).toEqual([0, 0, 0]);
    expect(missingEntries([])).toEqual([]);
  });

  it("finds a player skipped while those after them went on", () => {
    expect(missingEntries([8, 7, 8])).toEqual([0, 1, 0]);
    expect(missingEntries([7, 8, 8])).toEqual([1, 0, 0]);
  });

  it("finds a player two or more entries behind", () => {
    expect(missingEntries([8, 8, 6])).toEqual([0, 0, 1]);
    expect(missingEntries([9, 6, 9])).toEqual([0, 3, 0]);
  });
});
