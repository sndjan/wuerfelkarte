import { BULL_SEGMENT, dart } from "./scoring";
import { Dart } from "./types";

/**
 * Geometry of a real dartboard, as plain data.
 *
 * The sector order, the ring sequence and the colours are the real board's,
 * scaled into one square viewBox. The ring widths are not: doubles, trebles
 * and both bulls are all wider than the official 8mm and 6mm, because those
 * are hit with a dart, not with a fingertip.
 */

/** The number ring, clockwise from the 20 at the top. */
export const BOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

export const VIEWBOX = 440;
export const CENTER = VIEWBOX / 2;

export const R_DOUBLE_OUTER = 190;
export const R_DOUBLE_INNER = 170;
export const R_TRIPLE_OUTER = 123;
export const R_TRIPLE_INNER = 103;
export const R_OUTER_BULL = 30;
export const R_INNER_BULL = 15;
/** Where the printed numbers sit, just outside the double ring. */
export const R_NUMBERS = 206;

const SECTOR_DEGREES = 360 / BOARD_NUMBERS.length;

/** Middle of sector `index`, in SVG degrees — the 20 points straight up. */
export const sectorAngle = (index: number): number =>
  -90 + index * SECTOR_DEGREES;

const polar = (radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
};

const round = (value: number) => Math.round(value * 100) / 100;

/** The wedge between two radii, spanning one sector. */
const wedgePath = (
  index: number,
  innerRadius: number,
  outerRadius: number,
): string => {
  const from = sectorAngle(index) - SECTOR_DEGREES / 2;
  const to = sectorAngle(index) + SECTOR_DEGREES / 2;
  const outerStart = polar(outerRadius, from);
  const outerEnd = polar(outerRadius, to);
  const innerEnd = polar(innerRadius, to);
  const innerStart = polar(innerRadius, from);
  return [
    `M ${round(outerStart.x)} ${round(outerStart.y)}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${round(outerEnd.x)} ${round(outerEnd.y)}`,
    `L ${round(innerEnd.x)} ${round(innerEnd.y)}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${round(innerStart.x)} ${round(innerStart.y)}`,
    "Z",
  ].join(" ");
};

/** The board's four colours: the single beds alternate, the rings alternate. */
export type BoardTone = "dark" | "light" | "red" | "green";

export type BoardSegment = {
  /** Stable key — also what a click on this wedge records. */
  id: string;
  dart: Dart;
  path: string;
  tone: BoardTone;
};

const RINGS: Array<{
  name: string;
  inner: number;
  outer: number;
  multiplier: 1 | 2 | 3;
  tones: [BoardTone, BoardTone];
}> = [
  {
    name: "inner",
    inner: R_OUTER_BULL,
    outer: R_TRIPLE_INNER,
    multiplier: 1,
    tones: ["dark", "light"],
  },
  {
    name: "triple",
    inner: R_TRIPLE_INNER,
    outer: R_TRIPLE_OUTER,
    multiplier: 3,
    tones: ["red", "green"],
  },
  {
    name: "outer",
    inner: R_TRIPLE_OUTER,
    outer: R_DOUBLE_INNER,
    multiplier: 1,
    tones: ["dark", "light"],
  },
  {
    name: "double",
    inner: R_DOUBLE_INNER,
    outer: R_DOUBLE_OUTER,
    multiplier: 2,
    tones: ["red", "green"],
  },
];

/** All 80 numbered wedges, outermost ring last so it paints on top. */
export const BOARD_SEGMENTS: BoardSegment[] = RINGS.flatMap((ring) =>
  BOARD_NUMBERS.map((number, index) => ({
    id: `${ring.name}-${number}`,
    dart: dart(number, ring.multiplier),
    path: wedgePath(index, ring.inner, ring.outer),
    // The 20 carries a black single and a red double; its neighbours mirror it.
    tone: ring.tones[index % 2],
  })),
);

/** Label positions for the printed number ring. */
export const BOARD_LABELS = BOARD_NUMBERS.map((number, index) => {
  const point = polar(R_NUMBERS, sectorAngle(index));
  return { number, x: round(point.x), y: round(point.y) };
});

export const BULL_RINGS = [
  { id: "bull-25", dart: dart(BULL_SEGMENT, 1), radius: R_OUTER_BULL, tone: "green" as BoardTone },
  { id: "bull-50", dart: dart(BULL_SEGMENT, 2), radius: R_INNER_BULL, tone: "red" as BoardTone },
];
