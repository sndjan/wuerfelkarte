import { describe, expect, it } from "vitest";

import { apply, CARD_MM, findCorners, homography, MARK_CENTERS_MM, tweenQuad, type Quad } from "./corners";

/**
 * A synthetic photo: a dark table, the card in perspective, its four marks
 * (top left hollow), a QR-like checker, pale grid lines and some pen strokes.
 */
function photo(cardCorners: Quad, width = 480, height = 640): Uint8Array {
  const cardRect: Quad = [
    { x: 0, y: 0 },
    { x: CARD_MM.w, y: 0 },
    { x: CARD_MM.w, y: CARD_MM.h },
    { x: 0, y: CARD_MM.h },
  ];
  const toCard = homography(cardCorners, cardRect);
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = apply(toCard, { x, y });
      let g = 50; // table
      if (p.x >= 0 && p.y >= 0 && p.x <= CARD_MM.w && p.y <= CARD_MM.h) {
        g = 225;
        const inMark = (mx: number, my: number) => p.x >= mx && p.x <= mx + 5 && p.y >= my && p.y <= my + 5;
        const marks = [
          [5, 5],
          [CARD_MM.w - 10, 5],
          [5, CARD_MM.h - 10],
          [CARD_MM.w - 10, CARD_MM.h - 10],
        ];
        marks.forEach(([mx, my], i) => {
          if (!inMark(mx, my)) return;
          const hole = i === 0 && p.x > mx + 1.6 && p.x < mx + 3.4 && p.y > my + 1.6 && p.y < my + 3.4;
          g = hole ? 225 : 20;
        });
        // QR code: a checker of 0.5 mm modules
        if (p.x > 79 && p.x < 93 && p.y > 5.5 && p.y < 19.5) {
          g = (Math.floor(p.x * 2) + Math.floor(p.y * 2)) % 2 ? 20 : 225;
        }
        // grid lines
        if (p.y > 23 && p.y < 134 && (Math.abs((p.y - 23) % 7) < 0.3 || Math.abs((p.x - 30) % 17) < 0.3)) g = 160;
        // pen strokes
        if (p.y > 40 && p.y < 120 && Math.abs(((p.x * 3 + p.y) % 17) - 8) < 0.5 && p.x > 32) g = 70;
      }
      gray[y * width + x] = g;
    }
  }
  return gray;
}

/** Where a mark centre lands in the photo, for checking the result. */
function expectedCenters(cardCorners: Quad): Quad {
  const toPhoto = homography(
    [
      { x: 0, y: 0 },
      { x: CARD_MM.w, y: 0 },
      { x: CARD_MM.w, y: CARD_MM.h },
      { x: 0, y: CARD_MM.h },
    ],
    cardCorners,
  );
  return MARK_CENTERS_MM.map((p) => apply(toPhoto, p)) as Quad;
}

function expectNear(found: Quad | null, expected: Quad, tolerance = 4) {
  expect(found).not.toBeNull();
  found!.forEach((p, i) => {
    expect(Math.abs(p.x - expected[i].x)).toBeLessThan(tolerance);
    expect(Math.abs(p.y - expected[i].y)).toBeLessThan(tolerance);
  });
}

describe("homography", () => {
  it("maps the four points onto their targets", () => {
    const from: Quad = [{ x: 10, y: 20 }, { x: 300, y: 40 }, { x: 280, y: 400 }, { x: 30, y: 380 }];
    const to: Quad = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 150 }, { x: 0, y: 150 }];
    const m = homography(from, to);
    from.forEach((p, i) => {
      const q = apply(m, p);
      expect(q.x).toBeCloseTo(to[i].x, 6);
      expect(q.y).toBeCloseTo(to[i].y, 6);
    });
  });
});

describe("findCorners", () => {
  it("finds the marks of a tilted card in perspective", () => {
    const card: Quad = [{ x: 90, y: 70 }, { x: 400, y: 110 }, { x: 430, y: 580 }, { x: 50, y: 560 }];
    expectNear(findCorners(photo(card), 480, 640), expectedCenters(card));
  });

  it("starts with the hollow mark when the photo is upside down", () => {
    // The card's top left lies at the bottom right of the photo.
    const card: Quad = [{ x: 420, y: 590 }, { x: 70, y: 600 }, { x: 60, y: 60 }, { x: 410, y: 40 }];
    expectNear(findCorners(photo(card), 480, 640), expectedCenters(card));
  });

  it("works for a card turned sideways", () => {
    const card: Quad = [{ x: 450, y: 60 }, { x: 460, y: 330 }, { x: 40, y: 340 }, { x: 30, y: 70 }];
    expectNear(findCorners(photo(card, 480, 400), 480, 400), expectedCenters(card));
  });

  it("gives up on a photo without the card", () => {
    const gray = new Uint8Array(480 * 640).fill(200);
    for (let i = 0; i < gray.length; i += 37) gray[i] = 30;
    expect(findCorners(gray, 480, 640)).toBeNull();
  });
});

describe("tweenQuad", () => {
  const upside: Quad = [{ x: 300, y: 400 }, { x: 100, y: 400 }, { x: 100, y: 100 }, { x: 300, y: 100 }];
  const upright: Quad = [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 400 }, { x: 100, y: 400 }];

  it("starts and ends on the given quads", () => {
    tweenQuad(upside, upright, 0).forEach((p, i) => expect(p.x).toBeCloseTo(upside[i].x, 6));
    tweenQuad(upside, upright, 1).forEach((p, i) => expect(p.y).toBeCloseTo(upright[i].y, 6));
  });

  it("turns a card upside down instead of shrinking it", () => {
    const half = tweenQuad(upside, upright, 0.5);
    const width = Math.hypot(half[1].x - half[0].x, half[1].y - half[0].y);
    expect(width).toBeCloseTo(200, 0);
  });
});
