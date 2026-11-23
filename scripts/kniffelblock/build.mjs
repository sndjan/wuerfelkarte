// Builds the printable Kniffelblock: one A6 card (one game, up to four players),
// four of them on an A4 page. The scan page (/scan) reads exactly this layout,
// so a change here that moves fields needs a new layout version (LAYOUT) and a
// matching prompt in src/games/scan/prompt.ts.
//
// Run: npm run kniffelblock   (needs Playwright; in the cloud box it is preinstalled)
// Writes public/kniffelblock.pdf and a preview PNG in docs/kniffelblock/.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import QRCode from "qrcode";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require(path.join(process.env.NODE_PATH ?? "/usr/lib/node_modules", "playwright")));
}

const LAYOUT = "a6";
const URL = `https://www.xn--wrfelkarte-9db.com/scan?b=${LAYOUT}`;

// ---- one card, in mm ----
const CW = 105, CH = 148.5;
const FID = 5;          // corner marker size
const FIN = 5;          // corner marker inset from the card edge (printers keep ~4 mm free)
const labelW = 23;
const cols = 4;
const gridX = 7;
const colW = (CW - 2 * gridX - labelW) / cols; // 17 mm
const gridTop = 23;
const ROW_H = 7;

const INK = "#1a1a1a";
const LINE = "#8fa9bf";  // light blue-grey: stands back from pen ink
const LABEL = "#4b6478";
const TINT = "#eef3f7";
const SUM = "#e3e9ee";

const rows = [
  { kind: "name", h: 9 },
  { kind: "num", face: 1 },
  { kind: "num", face: 2 },
  { kind: "num", face: 3 },
  { kind: "num", face: 4 },
  { kind: "num", face: 5 },
  { kind: "num", face: 6 },
  { kind: "gap", h: 2 },
  { kind: "num", label: "3er-Pasch" },
  { kind: "num", label: "4er-Pasch" },
  { kind: "num", label: "Full House", value: 25 },
  { kind: "num", label: "Kl. Straße", value: 30 },
  { kind: "num", label: "Gr. Straße", value: 40 },
  { kind: "num", label: "Kniffel", value: 50 },
  { kind: "num", label: "Chance" },
  { kind: "gap", h: 2 },
  { kind: "sum", label: "Summe" },
];

const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};

const rect = (x, y, w, h, a = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${a}/>`;
const text = (x, y, s, a = "") => `<text x="${x}" y="${y}" ${a}>${s}</text>`;
function die(x, y, s, n) {
  let d = rect(x, y, s, s, `fill="#fff" stroke="${LABEL}" stroke-width="0.35" rx="1"`);
  for (const [px, py] of PIPS[n]) d += `<circle cx="${x + px * s}" cy="${y + py * s}" r="${s * 0.095}" fill="${LABEL}"/>`;
  return d;
}

function card(qrInner, qrModules) {
  let g = "";
  // corner markers; the top-left one is hollow so the reader knows which way is up
  const far = CW - FIN - FID, low = CH - FIN - FID;
  for (const [x, y, hollow] of [[FIN, FIN, true], [far, FIN], [FIN, low], [far, low]]) {
    g += rect(x, y, FID, FID, `fill="${INK}"`);
    if (hollow) g += rect(x + 1.6, y + 1.6, FID - 3.2, FID - 3.2, `fill="#fff"`);
  }

  // header: wordmark left, QR right, nothing else
  g += text(gridX + 6, 13.5, "Würfelkarte", `font-size="6" font-weight="800" fill="${INK}"`);
  g += text(gridX + 6, 18.5, "Kniffel", `font-size="3" fill="${LABEL}"`);
  const qrSize = 14;
  const qrX = CW - FIN - FID - 2 - qrSize, qrY = FIN + 0.5;
  g += `<g transform="translate(${qrX} ${qrY}) scale(${qrSize / qrModules})">${qrInner}</g>`;

  let y = gridTop;
  let zebra = 0;
  for (const r of rows) {
    if (r.kind === "gap") { y += r.h; continue; }
    const h = r.h ?? ROW_H;
    const isSum = r.kind === "sum";
    const fill = isSum ? SUM : zebra % 2 ? TINT : "#fff";
    g += rect(gridX, y, labelW, h, `fill="${fill}" stroke="${LINE}" stroke-width="0.3"`);
    const ty = y + h / 2 + 1.1;
    if (r.face) {
      g += die(gridX + (labelW - 5.4) / 2, y + (h - 5.4) / 2, 5.4, r.face);
    } else if (r.kind === "name") {
      g += text(gridX + 2, ty, "Name", `font-size="3.2" font-weight="700" fill="${LABEL}"`);
    } else {
      g += text(gridX + 1.8, ty, r.label, `font-size="2.9" font-weight="700" fill="${INK}"`);
      if (r.value) g += text(gridX + labelW - 1.5, ty, String(r.value), `font-size="2.9" font-weight="800" fill="${LABEL}" text-anchor="end"`);
    }
    for (let c = 0; c < cols; c++) {
      g += rect(gridX + labelW + c * colW, y, colW, h, `fill="${isSum ? SUM : "#fff"}" stroke="${LINE}" stroke-width="0.3"`);
    }
    y += h;
    if (!isSum) zebra++;
  }
  // thicker frame around the player area keeps the columns easy to find
  g += rect(gridX + labelW, gridTop, colW * cols, rows.find((r) => r.kind === "name").h, `fill="none" stroke="${LABEL}" stroke-width="0.5"`);
  return g;
}

async function build() {
  const qr = await QRCode.toString(URL, { type: "svg", margin: 0, errorCorrectionLevel: "L" });
  const qrInner = qr.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const qrModules = Number(qr.match(/viewBox="0 0 (\d+)/)[1]);
  const one = card(qrInner, qrModules);

  const svg = (w, h, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif">${body}</svg>`;

  // A4 with four cards and dashed cut lines through the middle
  let sheet = "";
  for (const [dx, dy] of [[0, 0], [CW, 0], [0, CH], [CW, CH]]) sheet += `<g transform="translate(${dx} ${dy})">${one}</g>`;
  sheet += `<line x1="${CW}" y1="0" x2="${CW}" y2="${2 * CH}" stroke="#c4ced6" stroke-width="0.25" stroke-dasharray="2 2"/>`;
  sheet += `<line x1="0" y1="${CH}" x2="${2 * CW}" y2="${CH}" stroke="#c4ced6" stroke-width="0.25" stroke-dasharray="2 2"/>`;

  const page = (size, body) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Kniffelblock</title>
<style>@page{size:${size};margin:0}html,body{margin:0;padding:0;background:#fff}svg{display:block}</style></head><body>${body}</body></html>`;

  const docs = "docs/kniffelblock";
  fs.mkdirSync(docs, { recursive: true });
  for (const f of fs.readdirSync(docs)) if (f.startsWith("kniffelblock")) fs.rmSync(path.join(docs, f));
  const a4 = path.join(docs, "a4.html");
  const a6 = path.join(docs, "a6.html");
  fs.writeFileSync(a4, page("A4", svg(2 * CW, 2 * CH, sheet)));
  fs.writeFileSync(a6, page("105mm 148.5mm", svg(CW, CH, one)));

  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await p.goto("file://" + path.resolve(a4));
  await p.pdf({ path: "public/kniffelblock.pdf", format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await p.screenshot({ path: path.join(docs, "a4.png"), fullPage: true });
  await p.setViewportSize({ width: 397, height: 561 });
  await p.goto("file://" + path.resolve(a6));
  await p.screenshot({ path: path.join(docs, "a6.png"), fullPage: true });
  await browser.close();
  console.log("wrote public/kniffelblock.pdf and", docs);
}

build();
