"use client";

import { useEffect, useRef, useState } from "react";

import { cardTarget, homography, tweenQuad, warp, type Quad } from "../corners";

/** Stage size in CSS px; the canvas draws at up to twice that. */
const STAGE_W = 320;
const STAGE_H = 440;
const SNAP_MS = 500;
const STRAIGHTEN_MS = 800;
/** How long the stage shows at the least, so the straightening and one sweep are seen. */
export const stageMinMs = (straightens: boolean) => (straightens ? SNAP_MS + STRAIGHTEN_MS + 1300 : 1300);

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function rgbOf(color: string): [number, number, number] {
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/**
 * The photo while it is being read: green brackets snap onto the four
 * corner marks, the card straightens out, then a scan line runs over it until
 * the answer is back. All of it is drawn from the corners found in code;
 * without them the scan line runs over the photo as it is.
 */
export function ScanStage({ photo, quad }: { photo: HTMLCanvasElement; quad: Quad | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanBox, setScanBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(STAGE_W * dpr);
    const H = Math.round(STAGE_H * dpr);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const bgColor = cssColor("--surface-sunken", "#dcebdf");
    const bg = rgbOf(bgColor);
    const brand = cssColor("--brand", "#2f9161");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The photo, letterboxed into the stage: the source every frame is drawn from.
    const k = Math.min(W / photo.width, H / photo.height);
    const pw = photo.width * k;
    const ph = photo.height * k;
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(photo, px, py, pw, ph);
    const source = ctx.getImageData(0, 0, W, H);

    const toBox = (x: number, y: number, w: number, h: number) => setScanBox({ x: x / dpr, y: y / dpr, w: w / dpr, h: h / dpr });
    if (!quad) {
      toBox(px, py, pw, ph);
      return;
    }

    // Where the card ends up: as large as fits, with a margin.
    const margin = 12 * dpr;
    let cardH = H - 2 * margin;
    let cardW = (cardH * 105) / 148.5;
    if (cardW > W - 2 * margin) {
      cardW = W - 2 * margin;
      cardH = (cardW * 148.5) / 105;
    }
    const cx = (W - cardW) / 2;
    const cy = (H - cardH) / 2;
    const target = cardTarget(cardW, cardH, cx, cy);
    const start = quad.map((p) => ({ x: px + p.x * k, y: py + p.y * k })) as Quad;
    const frame = ctx.createImageData(W, H);

    const brackets = (at: Quad, scale: number, alpha: number) => {
      const arm = 14 * dpr * scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = brand;
      ctx.lineWidth = 4 * dpr;
      ctx.lineCap = "round";
      // Each bracket opens towards the outside of the card.
      at.forEach((p, i) => {
        const sx = i === 0 || i === 3 ? -1 : 1;
        const sy = i < 2 ? -1 : 1;
        const o = 8 * dpr * scale;
        ctx.beginPath();
        ctx.moveTo(p.x + sx * o, p.y + sy * o - sy * arm);
        ctx.lineTo(p.x + sx * o, p.y + sy * o);
        ctx.lineTo(p.x + sx * o - sx * arm, p.y + sy * o);
        ctx.stroke();
      });
      ctx.restore();
    };

    const drawAt = (at: Quad, smooth: boolean) => {
      warp(source, homography(at, start), frame, bg, smooth);
      ctx.putImageData(frame, 0, 0);
    };

    if (reduced) {
      drawAt(target, true);
      toBox(cx, cy, cardW, cardH);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      if (t < SNAP_MS) {
        ctx.putImageData(source, 0, 0);
        const p = t / SNAP_MS;
        brackets(start, 1 + (1 - ease(p)) * 1.6, Math.min(1, p * 2));
      } else if (t < SNAP_MS + STRAIGHTEN_MS) {
        const at = tweenQuad(start, target, ease((t - SNAP_MS) / STRAIGHTEN_MS));
        drawAt(at, false);
        brackets(at, 1, 1);
      } else {
        drawAt(target, true);
        toBox(cx, cy, cardW, cardH);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [photo, quad]);

  return (
    <div
      className="relative overflow-hidden rounded-[20px] bg-surface-sunken"
      style={{ width: STAGE_W, height: STAGE_H }}
    >
      <style>{`
        @keyframes wk-scan-sweep { 0% { top: 0% } 85%, 100% { top: 100% } }
        @keyframes wk-scan-wash { 0% { height: 0% } 85%, 100% { height: 100% } }
        .wk-scan-line { animation: wk-scan-sweep 1.3s cubic-bezier(.45,.05,.55,.95) infinite; }
        .wk-scan-wash { animation: wk-scan-wash 1.3s cubic-bezier(.45,.05,.55,.95) infinite; }
        @media (prefers-reduced-motion: reduce) { .wk-scan-line, .wk-scan-wash { display: none; } }
      `}</style>
      <canvas ref={canvasRef} className="block size-full" aria-hidden="true" />
      {scanBox && (
        <div
          className="pointer-events-none absolute overflow-visible"
          style={{ left: scanBox.x, top: scanBox.y, width: scanBox.w, height: scanBox.h }}
          aria-hidden="true"
        >
          <div className="wk-scan-wash absolute inset-x-0 top-0 bg-brand/15" />
          <div className="wk-scan-line absolute -inset-x-2 h-[3px] bg-brand shadow-[0_0_18px_6px_color-mix(in_srgb,var(--brand)_45%,transparent)]" />
        </div>
      )}
    </div>
  );
}
