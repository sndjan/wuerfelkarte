"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { toPng } from "html-to-image";

import { Button } from "@/components/ui/button";
import { ScoredPlayer } from "../types";

/**
 * What a game contributes to its shared result. Everything else — the ranking,
 * the layout, the 1200x1200 PNG, the Web-Share/WhatsApp fallback chain — is the
 * same for every game.
 */
export type ShareConfig = {
  /** Leads the text header and, unless `imageSrc` is set, the PNG header. */
  emoji: string;
  /** Named in the text header ("Würfelkarte - Wizard Ergebnis"); Yatzy has none. */
  gameName?: string;
  /** The "⭐ Modus:" line, e.g. "Standard · Plus/Minus Eins". */
  modeLabel: string;
  /** Headline inside the PNG, e.g. "Flip 7 · 200". */
  imageTitle: string;
  imageTitleFontSize?: number;
  /** Optional artwork replacing the emoji in the PNG header. */
  imageSrc?: string;
  /** Goes into the shared file name: wuerfelkarte-<slug>.png */
  fileSlug: string;
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/** Dense ranking: tied players share a rank, and the next distinct score follows. */
const rankMap = (players: ScoredPlayer[]): Map<number, number> => {
  const distinctDesc = Array.from(new Set(players.map((p) => p.score))).sort(
    (a, b) => b - a,
  );
  const ranks = new Map<number, number>();
  distinctDesc.forEach((score, index) => ranks.set(score, index + 1));
  return ranks;
};

const MEDALS = ["🥇 ", "🥈 ", "🥉 ", "4️⃣ ", "5️⃣ ", "6️⃣ ", "7️⃣ ", "8️⃣ ", "9️⃣ ", "🔟 "];

const medalForRank = (rank: number) => MEDALS[rank - 1] ?? ` ${rank}. `;

export function buildShareText(
  players: ScoredPlayer[],
  config: ShareConfig,
  date = new Date(),
): string {
  const ranks = rankMap(players);

  const lines = [...players]
    .sort((a, b) => b.score - a.score)
    .map((player) => {
      const prefix = medalForRank(ranks.get(player.score) ?? 0);
      const namePrefix = player.emoji ? `${player.emoji} ` : "";
      return `${prefix}${namePrefix}${player.name}: ${player.score} Punkte`;
    });

  const dateStr = date.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const header = `${config.emoji} Würfelkarte - ${
    config.gameName ? `${config.gameName} ` : ""
  }Ergebnis`;

  return [
    header,
    `📆 ${dateStr}`,
    `⭐ Modus: ${config.modeLabel}`,
    "",
    ...lines,
    `\nGespielt mit www.würfelkarte.com`,
  ].join("\n");
}

const BAR_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"];
const NEUTRAL_BAR = "#e5e5e5";

/** Renders the result off-screen at 1200x1200 and returns it as a PNG blob. */
async function generateScoreImage(
  players: ScoredPlayer[],
  config: ShareConfig,
  date = new Date(),
): Promise<Blob | null> {
  if (document?.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font-loading errors — the image still renders.
    }
  }

  const totals = [...players].sort((a, b) => b.score - a.score);
  const maxTotal = Math.max(totals[0]?.score ?? 1, 1);

  const availableListHeight = 780;
  const rowGap = 16;
  const rowHeight = Math.min(
    120,
    Math.max(
      40,
      Math.floor(
        (availableListHeight - (totals.length - 1) * rowGap) / totals.length,
      ),
    ),
  );
  const scoreFontSize = Math.floor(rowHeight * 0.45);
  const nameFontSize = Math.floor(rowHeight * 0.38);

  const barsHTML = totals
    .map((player, index) => {
      const barWidth = (Math.max(player.score, 0) / maxTotal) * 100;
      const color = BAR_COLORS[index] ?? NEUTRAL_BAR;
      const displayName = player.emoji
        ? `${player.emoji} ${player.name}`
        : player.name;
      return `
        <div style="position:relative; width:100%; height:${rowHeight}px; border-radius:12px; margin-bottom:${rowGap}px; overflow:hidden;">
          <div style="position:absolute; top:0; left:0; height:100%; width:100%; background:#2a2a2a; border-radius:12px;"></div>
          <div style="position:absolute; top:0; left:0; height:100%; width:${barWidth}%; background:${color}; border-radius:12px;"></div>
          <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding:0 24px;">
            <div style="font-weight:700; font-size:${scoreFontSize}px; color:#fafafa; text-shadow:0 1px 4px rgba(0,0,0,0.9);">${escapeHtml(String(player.score))}</div>
            <div style="font-weight:500; font-size:${nameFontSize}px; color:#fafafa; text-shadow:0 1px 4px rgba(0,0,0,0.9);">${escapeHtml(displayName)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  const iconHTML = config.imageSrc
    ? `<img src="${config.imageSrc}" alt="" style="width: 80px; height: 80px; object-fit: contain;" />`
    : `<div style="font-size:80px;">${config.emoji}</div>`;

  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "1200px";
  wrapper.style.height = "1200px";
  wrapper.style.zIndex = "999999";

  wrapper.innerHTML = `
    <div style="
      width: 1200px;
      height: 1200px;
      background: #0a0a0a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
    ">
      <div style="
        width: 1040px;
        height: 1040px;
        border-radius: 40px;
        padding: 60px;
        box-sizing: border-box;
        position: relative;
        background: linear-gradient(180deg,#1c1c1c 0%, #1c1c1c 100%);
        box-shadow: 0 30px 60px rgba(2,6,23,0.6);
        color: #d7e2ec;
      ">
        <div style="display: flex; align-items: center; gap: 30px;">
          ${iconHTML}
          <div style="font-weight:700; font-size:${
            config.imageTitleFontSize ?? 90
          }px; color:#fff;">${escapeHtml(config.imageTitle)}</div>
        </div>
        <div style="margin-top:20px;">
          ${barsHTML}
        </div>
        <div style="position:absolute; left:60px; bottom:60px; color:#c0c0c0; font-weight:700; font-size:36px;">würfelkarte.com</div>
        <div style="position:absolute; right:60px; bottom:60px; color:#c0c0c0; font-weight:700; font-size:36px;">
          ${escapeHtml(
            date.toLocaleString("de-DE", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          )}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    const contentDiv = wrapper.firstElementChild as HTMLElement;
    const dataUrl = await toPng(contentDiv, {
      width: 1200,
      height: 1200,
      pixelRatio: 1,
      backgroundColor: "#0a0a0a",
      style: {
        transform: "scale(1)",
        transformOrigin: "top left",
        width: "1200px",
        height: "1200px",
      },
    });
    document.body.removeChild(wrapper);
    const response = await fetch(dataUrl);
    return await response.blob();
  } catch (error) {
    console.error("Failed to generate image:", error);
    if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
    return null;
  }
}

type NavigatorWithShare = Navigator & {
  share?: (data: {
    title?: string;
    text?: string;
    files?: File[];
  }) => Promise<void>;
};

/**
 * Shares the result as an image where the platform supports it, as text where
 * it supports only that, and via WhatsApp everywhere else.
 */
export function ShareResult({
  players,
  config,
}: {
  players: ScoredPlayer[];
  config: ShareConfig;
}) {
  const [sharing, setSharing] = useState(false);

  const shareViaWhatsApp = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);

    const text = buildShareText(players, config);

    try {
      const nav = navigator as NavigatorWithShare;
      const hasWebShare = navigator && "share" in navigator;
      const supportsFiles =
        hasWebShare &&
        "canShare" in navigator &&
        navigator.canShare({ files: [new File([], "test")] });

      if (supportsFiles) {
        const imageBlob = await generateScoreImage(players, config);
        if (imageBlob) {
          const file = new File(
            [imageBlob],
            `wuerfelkarte-${config.fileSlug}.png`,
            { type: "image/png" },
          );
          await nav.share?.({
            title: `Würfelkarte ${config.gameName ?? ""} Ergebnis`.replace(
              /\s+/g,
              " ",
            ),
            text,
            files: [file],
          });
          return;
        }
      }

      if (hasWebShare) {
        await nav.share?.({ title: "Würfelkarte", text });
        return;
      }

      shareViaWhatsApp(text);
    } catch (e) {
      console.error("Sharing failed:", e);
      shareViaWhatsApp(text);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Button onClick={onShare} disabled={sharing} variant="secondary" size="sm">
      <Share2 /> {sharing ? "Teilen…" : "Teilen"}
    </Button>
  );
}
