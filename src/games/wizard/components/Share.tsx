import { Share2 } from "lucide-react";
import { useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { wizardGamemodes } from "../gamemodes";
import { WizardGamemodeKey } from "../types";

type ScoredPlayer = {
  id: string;
  name: string;
  emoji?: string;
  score: number;
};

const modeLabel = (gamemode: WizardGamemodeKey, plusMinusOne: boolean) =>
  plusMinusOne
    ? `${wizardGamemodes[gamemode].name} · Plus/Minus Eins`
    : wizardGamemodes[gamemode].name;

export function buildScoreText(
  players: ScoredPlayer[],
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
  date = new Date(),
) {
  const uniqueScoresDesc = Array.from(
    new Set(players.map((p) => p.score)),
  ).sort((a, b) => b - a);
  const scoreToRank = new Map<number, number>();
  uniqueScoresDesc.forEach((score, idx) => scoreToRank.set(score, idx + 1));

  const medalForRank = (rank: number) => {
    if (rank === 1) return "🥇 ";
    if (rank === 2) return "🥈 ";
    if (rank === 3) return "🥉 ";
    if (rank === 4) return "4️⃣ ";
    if (rank === 5) return "5️⃣ ";
    if (rank === 6) return "6️⃣ ";
    return ` ${rank}. `;
  };

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const lines = sorted.map((p) => {
    const rank = scoreToRank.get(p.score) ?? 0;
    const namePrefix = p.emoji ? `${p.emoji} ` : "";
    return `${medalForRank(rank)}${namePrefix}${p.name}: ${p.score} Punkte`;
  });

  const dateStr = date.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const header = `🧙 Würfelkarte - Wizard Ergebnis`;
  const dateLine = `📆 ${dateStr}`;
  const modeLine = `⭐ Modus: ${modeLabel(gamemode, plusMinusOne)}`;
  const footer = `\nGespielt mit www.würfelkarte.com`;
  return [header, dateLine, modeLine, "", ...lines, footer].join("\n");
}

async function generateScoreImage(
  players: ScoredPlayer[],
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
  date = new Date(),
): Promise<Blob | null> {
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  if (document?.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font-loading errors, image still renders
    }
  }

  const totals = [...players].sort((a, b) => b.score - a.score);
  const maxTotal = Math.max(totals[0]?.score ?? 1, 1);

  const barColor = (index: number) =>
    index === 0
      ? "#ffd700"
      : index === 1
        ? "#c0c0c0"
        : index === 2
          ? "#cd7f32"
          : "#e5e5e5";

  const availableListHeight = 780;
  const rowGap = 16;
  const rowHeight = Math.min(
    120,
    Math.max(
      60,
      Math.floor(
        (availableListHeight - (totals.length - 1) * rowGap) / totals.length,
      ),
    ),
  );
  const scoreFontSize = Math.floor(rowHeight * 0.45);
  const nameFontSize = Math.floor(rowHeight * 0.38);

  const barsHTML = totals
    .map((t, index) => {
      const barWidth = (Math.max(t.score, 0) / maxTotal) * 100;
      const color = barColor(index);
      const displayName = t.emoji ? `${t.emoji} ${t.name}` : t.name;
      return `
        <div style="position:relative; width:100%; height:${rowHeight}px; border-radius:12px; margin-bottom:${rowGap}px; overflow:hidden;">
          <div style="position:absolute; top:0; left:0; height:100%; width:100%; background:#2a2a2a; border-radius:12px;"></div>
          <div style="position:absolute; top:0; left:0; height:100%; width:${barWidth}%; background:${color}; border-radius:12px;"></div>
          <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding:0 24px;">
            <div style="font-weight:700; font-size:${scoreFontSize}px; color:#fafafa; text-shadow:0 1px 4px rgba(0,0,0,0.9);">${escapeHtml(String(t.score))}</div>
            <div style="font-weight:500; font-size:${nameFontSize}px; color:#fafafa; text-shadow:0 1px 4px rgba(0,0,0,0.9);">${escapeHtml(displayName)}</div>
          </div>
        </div>
      `;
    })
    .join("");

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
          <div style="font-size:80px;">🧙</div>
          <div style="font-weight:700; font-size:90px; color:#fff;">${escapeHtml(
            modeLabel(gamemode, plusMinusOne),
          )}</div>
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
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
    return null;
  }
}

type ShareProps = {
  gamemode: WizardGamemodeKey;
  plusMinusOne: boolean;
  players: ScoredPlayer[];
};

export const Share = ({ gamemode, plusMinusOne, players }: ShareProps) => {
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);

    try {
      const hasWebShare = navigator && "share" in navigator;
      const supportsFiles =
        hasWebShare &&
        "canShare" in navigator &&
        navigator.canShare({ files: [new File([], "test")] });

      if (supportsFiles) {
        const imageBlob = await generateScoreImage(
          players,
          gamemode,
          plusMinusOne,
        );
        if (imageBlob) {
          type NavigatorWithShare = Navigator & {
            share?: (data: {
              title?: string;
              text?: string;
              files?: File[];
            }) => Promise<void>;
          };
          const nav = navigator as NavigatorWithShare;

          const file = new File([imageBlob], "wuerfelkarte-wizard.png", {
            type: "image/png",
          });
          const text = buildScoreText(players, gamemode, plusMinusOne);

          await nav.share?.({
            title: "Würfelkarte Wizard Ergebnis",
            text,
            files: [file],
          });
          setSharing(false);
          return;
        }
      }

      const text = buildScoreText(players, gamemode, plusMinusOne);

      if (hasWebShare) {
        type NavigatorWithShare = Navigator & {
          share?: (data: { title?: string; text?: string }) => Promise<void>;
        };
        const nav = navigator as NavigatorWithShare;
        await nav.share?.({ title: "Würfelkarte", text });
        setSharing(false);
        return;
      }

      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    } catch (e) {
      console.error("Sharing failed:", e);
      const text = buildScoreText(players, gamemode, plusMinusOne);
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Button onClick={onShare} disabled={sharing} variant="secondary" size="sm">
      <Share2 /> {sharing ? "Teilen…" : "Teilen"}
    </Button>
  );
};
