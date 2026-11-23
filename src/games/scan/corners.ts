/**
 * Straightens a photo of the paper block without any AI: the card carries a
 * black square in each corner (the top-left one hollow), so plain image
 * processing finds them, and a perspective transform (homography) turns the
 * tilted card back into a flat rectangle. Pure functions over grey or RGBA
 * pixel arrays, so they run in the browser and in tests alike.
 *
 * Card geometry comes from scripts/kniffelblock/build.mjs (layout "a6").
 */

export type Point = { x: number; y: number };
/** Corner marks in card order: top left (the hollow one), top right, bottom right, bottom left. */
export type Quad = [Point, Point, Point, Point];
export type Matrix = number[]; // 3×3, row-major

/** The A6 card in mm and where the centres of its corner marks sit. */
export const CARD_MM = { w: 105, h: 148.5 };
const MARK_INSET = 7.5; // 5 mm from the edge + half the 5 mm square
export const MARK_CENTERS_MM: Quad = [
  { x: MARK_INSET, y: MARK_INSET },
  { x: CARD_MM.w - MARK_INSET, y: MARK_INSET },
  { x: CARD_MM.w - MARK_INSET, y: CARD_MM.h - MARK_INSET },
  { x: MARK_INSET, y: CARD_MM.h - MARK_INSET },
];

/** The homography that maps the four `from` points onto the four `to` points. */
export function homography(from: Quad, to: Quad): Matrix {
  // Eight equations, eight unknowns (h33 = 1), solved by Gaussian elimination.
  const a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i];
    const { x: u, y: v } = to[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const p = a[col][col];
    if (Math.abs(p) < 1e-12) throw new Error("degenerate quad");
    for (let c = col; c < 9; c++) a[col][c] /= p;
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f !== 0) for (let c = col; c < 9; c++) a[r][c] -= f * a[col][c];
    }
  }
  return [a[0][8], a[1][8], a[2][8], a[3][8], a[4][8], a[5][8], a[6][8], a[7][8], 1];
}

export function apply(m: Matrix, p: Point): Point {
  const w = m[6] * p.x + m[7] * p.y + m[8];
  return { x: (m[0] * p.x + m[1] * p.y + m[2]) / w, y: (m[3] * p.x + m[4] * p.y + m[5]) / w };
}

/** Otsu's threshold: the grey level that best splits the image into dark and light. */
function otsu(gray: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const g of gray) hist[g]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

type Blob = { cx: number; cy: number; w: number; h: number; area: number; hollow: boolean };

/** Dark, roughly square blobs: corner marks, and whatever else looks like one. */
function squareBlobs(gray: Uint8Array, width: number, height: number): Blob[] {
  // Darker than the paper by a margin, so pale grid lines and soft shadows stay out.
  const t = Math.min(otsu(gray), 140) * 0.8;
  const dark = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) dark[i] = gray[i] < t ? 1 : 0;

  const seen = new Uint8Array(gray.length);
  const stack = new Int32Array(gray.length);
  const maxSide = Math.max(width, height) / 8;
  const blobs: Blob[] = [];
  for (let start = 0; start < dark.length; start++) {
    if (!dark[start] || seen[start]) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    let area = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    while (top > 0) {
      const i = stack[--top];
      const x = i % width;
      const y = (i - x) / width;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const push = (j: number) => {
        if (dark[j] && !seen[j]) {
          seen[j] = 1;
          stack[top++] = j;
        }
      };
      if (x > 0) push(i - 1);
      if (x < width - 1) push(i + 1);
      if (y > 0) push(i - width);
      if (y < height - 1) push(i + width);
    }
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w < 4 || h < 4 || w > maxSide || h > maxSide) continue;
    if (Math.max(w, h) / Math.min(w, h) > 1.8) continue;
    const fill = area / (w * h);
    if (fill < 0.4) continue;
    // Hollow: the middle fifth of the box is mostly light.
    let inner = 0;
    let innerDark = 0;
    for (let y = Math.round(minY + h * 0.4); y <= Math.round(minY + h * 0.6); y++) {
      for (let x = Math.round(minX + w * 0.4); x <= Math.round(minX + w * 0.6); x++) {
        inner++;
        innerDark += dark[y * width + x];
      }
    }
    const hollow = inner > 0 && innerDark / inner < 0.3;
    if (!hollow && fill < 0.7) continue;
    blobs.push({ cx: minX + w / 2, cy: minY + h / 2, w, h, area, hollow });
  }
  return blobs;
}

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The centres of the four corner marks in a grey image, in card order, or
 * null when no card is found. Works for any rotation: the hollow mark is
 * always returned first.
 */
export function findCorners(gray: Uint8Array, width: number, height: number): Quad | null {
  const all = squareBlobs(gray, width, height);
  if (all.length < 4) return null;
  // The corner marks are the largest squares on the card (the QR code's
  // pieces and handwriting are smaller); keep everything near their size.
  const sizes = all.map((b) => Math.sqrt(b.w * b.h)).sort((a, b) => b - a);
  const ref = sizes[Math.min(3, sizes.length - 1)];
  const blobs = all.filter((b) => Math.sqrt(b.w * b.h) >= ref * 0.6);
  if (blobs.length < 4) return null;

  // The four outermost: one per diagonal direction.
  const pick = (score: (b: Blob) => number) => blobs.reduce((best, b) => (score(b) > score(best) ? b : best));
  const chosen = [
    pick((b) => -(b.cx + b.cy)),
    pick((b) => b.cx - b.cy),
    pick((b) => b.cx + b.cy),
    pick((b) => b.cy - b.cx),
  ];
  if (new Set(chosen).size < 4) return null;

  // Clockwise on screen (y points down), starting with the hollow mark.
  const cx = chosen.reduce((s, b) => s + b.cx, 0) / 4;
  const cy = chosen.reduce((s, b) => s + b.cy, 0) / 4;
  chosen.sort((a, b) => Math.atan2(a.cy - cy, a.cx - cx) - Math.atan2(b.cy - cy, b.cx - cx));
  const hollow = chosen.filter((b) => b.hollow);
  const first = hollow.length === 1 ? chosen.indexOf(hollow[0]) : chosen.indexOf(chosen.reduce((a, b) => (b.cx + b.cy < a.cx + a.cy ? b : a)));
  const ordered = [0, 1, 2, 3].map((k) => chosen[(first + k) % 4]);
  const quad = ordered.map((b) => ({ x: b.cx, y: b.cy })) as Quad;

  // Plausibility: a convex quad of reasonable size with the card's proportions.
  for (let i = 0; i < 4; i++) {
    if (cross(quad[i], quad[(i + 1) % 4], quad[(i + 2) % 4]) <= 0) return null;
  }
  const area =
    Math.abs(
      quad.reduce((s, p, i) => s + p.x * quad[(i + 1) % 4].y - quad[(i + 1) % 4].x * p.y, 0),
    ) / 2;
  if (area < width * height * 0.08) return null;
  const top = dist(quad[0], quad[1]);
  const bottom = dist(quad[3], quad[2]);
  const left = dist(quad[0], quad[3]);
  const right = dist(quad[1], quad[2]);
  if (Math.max(top, bottom) / Math.min(top, bottom) > 2 || Math.max(left, right) / Math.min(left, right) > 2) return null;
  const ratio = (top + bottom) / (left + right);
  const expected = (CARD_MM.w - 2 * MARK_INSET) / (CARD_MM.h - 2 * MARK_INSET);
  if (ratio < expected * 0.55 || ratio > expected * 1.8) return null;
  return quad;
}

/** Grey levels of an RGBA image. */
export function toGray(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    gray[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  }
  return gray;
}

/**
 * Draws `src` through a perspective into `out`: `toSource` maps each output
 * pixel to where it comes from. Outside the source is filled with `bg`.
 */
export function warp(
  src: { data: Uint8ClampedArray; width: number; height: number },
  toSource: Matrix,
  out: { data: Uint8ClampedArray; width: number; height: number },
  bg: [number, number, number] = [27, 42, 33],
  smooth = true,
): void {
  const { data: s, width: sw, height: sh } = src;
  const { data: o, width: ow, height: oh } = out;
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = toSource;
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const w = m6 * x + m7 * y + m8;
      const sx = (m0 * x + m1 * y + m2) / w;
      const sy = (m3 * x + m4 * y + m5) / w;
      const k = (y * ow + x) * 4;
      if (sx < 0 || sy < 0 || sx > sw - 1 || sy > sh - 1) {
        o[k] = bg[0];
        o[k + 1] = bg[1];
        o[k + 2] = bg[2];
        o[k + 3] = 255;
        continue;
      }
      if (!smooth) {
        const j = ((sy | 0) * sw + (sx | 0)) * 4;
        o[k] = s[j];
        o[k + 1] = s[j + 1];
        o[k + 2] = s[j + 2];
        o[k + 3] = 255;
        continue;
      }
      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = Math.min(x0 + 1, sw - 1);
      const y1 = Math.min(y0 + 1, sh - 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const a = (y0 * sw + x0) * 4;
      const b = (y0 * sw + x1) * 4;
      const c = (y1 * sw + x0) * 4;
      const d = (y1 * sw + x1) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const top = s[a + ch] + (s[b + ch] - s[a + ch]) * fx;
        const bottom = s[c + ch] + (s[d + ch] - s[c + ch]) * fx;
        o[k + ch] = top + (bottom - top) * fy;
      }
      o[k + 3] = 255;
    }
  }
}

/** Where the corner marks land when the whole card fills `width` × `height` px. */
export function cardTarget(width: number, height: number, x = 0, y = 0): Quad {
  const sx = width / CARD_MM.w;
  const sy = height / CARD_MM.h;
  return MARK_CENTERS_MM.map((p) => ({ x: x + p.x * sx, y: y + p.y * sy })) as Quad;
}

/**
 * The quad on its way from `a` to `b` at `t` (0–1): it turns about its middle
 * while it moves and changes shape, so a card photographed upside down rolls
 * over instead of collapsing through its centre.
 */
export function tweenQuad(a: Quad, b: Quad, t: number): Quad {
  const mid = (q: Quad) => ({ x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4, y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4 });
  const angle = (q: Quad) => Math.atan2(q[1].y - q[0].y + q[2].y - q[3].y, q[1].x - q[0].x + q[2].x - q[3].x);
  const turn = (p: Point, r: number) => ({ x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r) });
  const ca = mid(a);
  const cb = mid(b);
  let theta = angle(a) - angle(b);
  theta = Math.atan2(Math.sin(theta), Math.cos(theta));
  const c = { x: ca.x + (cb.x - ca.x) * t, y: ca.y + (cb.y - ca.y) * t };
  return a.map((p, i) => {
    const from = turn({ x: p.x - ca.x, y: p.y - ca.y }, -theta);
    const to = { x: b[i].x - cb.x, y: b[i].y - cb.y };
    const shape = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    const r = turn(shape, theta * (1 - t));
    return { x: c.x + r.x, y: c.y + r.y };
  }) as Quad;
}
