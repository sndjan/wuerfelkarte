import { describe, expect, it } from "vitest";

import { canCheckout, checkoutRoute, HIGHEST_CHECKOUT } from "./checkout";
import { dartLabel, dartValue, isDoubleDart } from "./scoring";
import type { DartsOutRule } from "./types";

const route = (
  remaining: number,
  dartsLeft = 3,
  rule: DartsOutRule = "double",
) => checkoutRoute(remaining, dartsLeft, rule)?.map(dartLabel) ?? null;

/** Nothing above 170 can be checked out on a double, and these seven can't either. */
const IMPOSSIBLE = [159, 162, 163, 165, 166, 168, 169];

describe("checkoutRoute", () => {
  it("suggests the routes a player would actually throw", () => {
    expect(route(170)).toEqual(["T20", "T20", "Bull"]);
    expect(route(167)).toEqual(["T20", "T19", "Bull"]);
    expect(route(141)).toEqual(["T20", "T19", "D12"]);
    expect(route(100)).toEqual(["T20", "D20"]);
    expect(route(81)).toEqual(["T19", "D12"]);
    expect(route(70)).toEqual(["T18", "D8"]);
    expect(route(50)).toEqual(["Bull"]);
    expect(route(40)).toEqual(["D20"]);
    expect(route(32)).toEqual(["D16"]);
    expect(route(2)).toEqual(["D1"]);
  });

  it("finishes everything that can be finished with double out", () => {
    for (let remaining = 2; remaining <= HIGHEST_CHECKOUT; remaining += 1) {
      const found = checkoutRoute(remaining, 3, "double");
      if (IMPOSSIBLE.includes(remaining)) {
        expect(found, `${remaining} should be impossible`).toBeNull();
        continue;
      }
      expect(found, `${remaining} should have a route`).not.toBeNull();
      const darts = found!;
      expect(darts.length).toBeLessThanOrEqual(3);
      expect(darts.reduce((sum, d) => sum + dartValue(d), 0)).toBe(remaining);
      expect(isDoubleDart(darts[darts.length - 1])).toBe(true);
    }
  });

  it("knows what cannot be done", () => {
    expect(route(1)).toBeNull();
    expect(route(171)).toBeNull();
    expect(route(0)).toBeNull();
  });

  it("respects the darts still in hand", () => {
    expect(route(170, 2)).toBeNull();
    expect(route(40, 1)).toEqual(["D20"]);
    expect(route(100, 1)).toBeNull();
    expect(canCheckout(100, 2, "double")).toBe(true);
    expect(canCheckout(100, 1, "double")).toBe(false);
  });

  it("walks out on a single with straight out", () => {
    expect(route(1, 3, "straight")).toEqual(["1"]);
    expect(route(20, 3, "straight")).toEqual(["20"]);
    expect(route(180, 3, "straight")).toEqual(["T20", "T20", "T20"]);
    expect(route(181, 3, "straight")).toBeNull();
  });

  it("allows a treble finish with master out", () => {
    expect(route(60, 3, "master")).toEqual(["T20"]);
    expect(route(20, 3, "master")).toEqual(["D10"]);
    expect(route(1, 3, "master")).toBeNull();
  });
});
