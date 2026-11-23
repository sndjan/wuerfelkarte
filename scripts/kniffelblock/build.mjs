// Builds the printable Kniffelblock (A4, one game, up to six players) as HTML + PDF + PNG.
// Draft v1. Run: node scripts/kniffelblock/build.mjs  (needs `qrcode` and Playwright resolvable)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(process.env.QR_FROM ?? import.meta.url);
const QRCode = require("qrcode");
const { chromium } = require("playwright");

const OUT = process.argv[2] ?? "docs/kniffelblock";
const URL = "https://www.xn--wrfelkarte-9db.com/scan?b=1"; // b = layout version

// ---- layout (mm) ----
const W = 210, H = 297;
const M = 10;                 // page margin
const FID = 9;                // corner marker size
const labelW = 50;
const cols = 6;
const colW = (W - 2 * M - labelW) / cols; // 25mm
const gridX = M;
const gridTop = 46;

const INK = "#1a1a1a";
const LINE = "#8fa9bf";       // light blue-grey: stands back from pen ink
const LABEL = "#4b6478";
const TINT = "#eef3f7";
const SUM = "#e3e9ee";

// kind: "name" | "num" | "fixed" | "sum"
const rows = [
  { kind: "name", label: "Name", h: 14 },
  { kind: "num", label: "Einser", hint: "nur diese Augen", face: 1 },
  { kind: "num", label: "Zweier", hint: "nur diese Augen", face: 2 },
  { kind: "num", label: "Dreier", hint: "nur diese Augen", face: 3 },
  { kind: "num", label: "Vierer", hint: "nur diese Augen", face: 4 },
  { kind: "num", label: "Fünfer", hint: "nur diese Augen", face: 5 },
  { kind: "num", label: "Sechser", hint: "nur diese Augen", face: 6 },
  { kind: "sum", label: "Summe oben", hint: "freiwillig" },
  { kind: "sum", label: "Bonus +35", hint: "ab 63 oben – freiwillig" },
  { kind: "gap", h: 3 },
  { kind: "num", label: "3er-Pasch", hint: "alle Augen" },
  { kind: "num", label: "4er-Pasch", hint: "alle Augen" },
  { kind: "fixed", label: "Full House", hint: "3 + 2 gleiche", value: 25 },
  { kind: "fixed", label: "Kleine Straße", hint: "4 in Folge", value: 30 },
  { kind: "fixed", label: "Große Straße", hint: "5 in Folge", value: 40 },
  { kind: "fixed", label: "Kniffel", hint: "5 gleiche", value: 50 },
  { kind: "num", label: "Chance", hint: "alle Augen" },
  { kind: "gap", h: 3 },
  { kind: "sum", label: "Endsumme", hint: "freiwillig – rechnet die App" },
];
const ROW_H = 11.5;

function rect(x, y, w, h, attrs = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${attrs}/>`;
}
function text(x, y, s, attrs = "") {
  return `<text x="${x}" y="${y}" ${attrs}>${s}</text>`;
}

const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};
function die(x, y, s, n) {
  let d = rect(x, y, s, s, `fill="#fff" stroke="${LABEL}" stroke-width="0.4" rx="1.2"`);
  for (const [px, py] of PIPS[n]) d += `<circle cx="${x + px * s}" cy="${y + py * s}" r="${s * 0.09}" fill="${LABEL}"/>`;
  return d;
}

async function build() {
  const qr = await QRCode.toString(URL, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const qrInner = qr.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const qrModules = Number(qr.match(/viewBox="0 0 (\d+)/)[1]);
  const qrSize = 24;

  let g = "";

  // corner markers: solid squares, top-left has a white core so orientation is unambiguous
  const corners = [
    [M - 4, M - 4, true],
    [W - M + 4 - FID, M - 4, false],
    [M - 4, H - M + 4 - FID, false],
    [W - M + 4 - FID, H - M + 4 - FID, false],
  ];
  for (const [x, y, core] of corners) {
    g += rect(x, y, FID, FID, `fill="${INK}"`);
    if (core) g += rect(x + 3, y + 3, FID - 6, FID - 6, `fill="#fff"`);
  }

  // header
  g += text(M + 8, 20, "Würfelkarte", `font-size="9" font-weight="800" fill="${INK}"`);
  g += text(M + 8, 26.5, "Kniffelblock · scannen und auswerten lassen", `font-size="4" fill="${LABEL}"`);
  g += text(M + 8, 36, "Datum", `font-size="3.2" fill="${LABEL}"`);
  g += `<line x1="${M + 20}" y1="36.5" x2="${M + 70}" y2="36.5" stroke="${LINE}" stroke-width="0.3"/>`;
  g += text(M + 78, 36, "Ort / Runde", `font-size="3.2" fill="${LABEL}"`);
  g += `<line x1="${M + 98}" y1="36.5" x2="${M + 142}" y2="36.5" stroke="${LINE}" stroke-width="0.3"/>`;
  const qrX = W - M - 4 - FID - 2 - qrSize, qrY = M + 4;
  g += `<g transform="translate(${qrX} ${qrY}) scale(${qrSize / qrModules})">${qrInner}</g>`;
  g += text(qrX + qrSize / 2, qrY + qrSize + 3.5, "Hier scannen", `font-size="2.8" fill="${LABEL}" text-anchor="middle"`);

  // grid
  let y = gridTop;
  let zebra = 0;
  for (const r of rows) {
    if (r.kind === "gap") { y += r.h; continue; }
    const h = r.h ?? ROW_H;
    const isSum = r.kind === "sum";
    // label cell
    g += rect(gridX, y, labelW, h, `fill="${isSum ? SUM : zebra % 2 ? TINT : "#fff"}" stroke="${LINE}" stroke-width="0.35"`);
    const ty = y + h / 2;
    if (r.kind === "name") {
      g += text(gridX + 3, ty + 1.4, r.label, `font-size="4.2" font-weight="700" fill="${INK}"`);
    } else {
      g += text(gridX + 3, ty + (r.hint ? 0 : 1.4), r.label, `font-size="4" font-weight="700" fill="${INK}"`);
      if (r.hint) g += text(gridX + 3, ty + 4, r.hint, `font-size="2.6" fill="${LABEL}"`);
      if (r.face) g += die(gridX + labelW - 3 - 7, ty - 3.5, 7, r.face);
      if (r.value) g += text(gridX + labelW - 3, ty + 1.6, String(r.value), `font-size="4.6" font-weight="800" fill="${LABEL}" text-anchor="end"`);
    }
    // player cells
    for (let c = 0; c < cols; c++) {
      const x = gridX + labelW + c * colW;
      g += rect(x, y, colW, h, `fill="${isSum ? SUM : "#fff"}" stroke="${LINE}" stroke-width="0.35"`);
      if (r.kind === "fixed") {
        // a tick box + strike box instead of writing the number
        const bs = 5.2;
        const bx1 = x + colW / 2 - bs - 1.5, bx2 = x + colW / 2 + 1.5, by = y + h / 2 - bs / 2 - 1;
        g += rect(bx1, by, bs, bs, `fill="none" stroke="${LABEL}" stroke-width="0.4" rx="0.6"`);
        g += rect(bx2, by, bs, bs, `fill="none" stroke="${LABEL}" stroke-width="0.4" rx="0.6"`);
        g += text(bx1 + bs / 2, by + bs + 2.6, "✓", `font-size="2.4" fill="${LABEL}" text-anchor="middle"`);
        g += text(bx2 + bs / 2, by + bs + 2.6, "✗", `font-size="2.4" fill="${LABEL}" text-anchor="middle"`);
      }
    }
    y += h;
    if (!isSum) zebra++;
  }

  // column numbers under the name row (helps the reader map columns)
  for (let c = 0; c < cols; c++) {
    const x = gridX + labelW + c * colW;
    g += text(x + 1.6, gridTop + 3.4, String(c + 1), `font-size="2.6" font-weight="700" fill="${LINE}"`);
  }

  // footer instructions
  const fy = y + 8;
  const notes = [
    "<tspan font-weight=\"700\">So trägst du ein:</tspan> Zahlen groß und deutlich mit dunklem Stift, eine Zahl pro Feld.",
    "Gestrichen? Ein <tspan font-weight=\"700\">X</tspan> ins Feld (zählt 0). Bei Full House, Straßen und Kniffel nur ankreuzen: ✓ geschafft, ✗ gestrichen.",
    "Summen sind freiwillig – die App rechnet selbst und zeigt Abweichungen an.",
    "Zum Auswerten QR-Code scannen und das ganze Blatt von oben fotografieren, alle vier schwarzen Ecken im Bild.",
  ];
  notes.forEach((n, i) => (g += text(M + 2, fy + i * 5, n, `font-size="3" fill="${LABEL}"`)));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif">${g}</svg>`;
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Kniffelblock</title>
<style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}svg{display:block}</style></head><body>${svg}</body></html>`;

  fs.mkdirSync(OUT, { recursive: true });
  const htmlPath = path.join(OUT, "kniffelblock.html");
  fs.writeFileSync(htmlPath, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await page.goto("file://" + path.resolve(htmlPath));
  await page.pdf({ path: path.join(OUT, "kniffelblock.pdf"), format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await page.screenshot({ path: path.join(OUT, "kniffelblock.png"), fullPage: true });
  await browser.close();
  console.log("wrote", OUT);
}

build();
