import { Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { gamemodes } from "./gamemodes/gamemodes";
import { Player } from "./hooks/types";
import { useState } from "react";
import { toPng } from "html-to-image";

function buildScoreText(
  players: Player[],
  date = new Date(),
  gamemode: keyof typeof gamemodes = "Wunder"
) {
  // Simple text summary to share: Name — total points
  // Compute totals (including upper-section bonus) for all players
  const totals = players.map((player) => {
    const firstSixSum = [
      player.points.Einser,
      player.points.Zweier,
      player.points.Dreier,
      player.points.Vierer,
      player.points.Fünfer,
      player.points.Sechser,
    ].reduce<number>(
      (sum, value) => sum + (typeof value === "number" ? value : 0),
      0
    );

    const minSum = gamemodes[gamemode].bonus?.minSum ?? 63;
    const bonus =
      firstSixSum >= minSum ? gamemodes[gamemode].bonus?.bonus ?? 0 : 0;

    const total =
      Object.values(player.points).reduce<number>((sum, value) => {
        return sum + (typeof value === "number" ? value : 0);
      }, 0) + bonus;

    return { id: player.id, name: player.name, total };
  });

  // Determine dense ranks (ties share the same rank) and assign medals for top 3
  const uniqueTotalsDesc = Array.from(new Set(totals.map((t) => t.total))).sort(
    (a, b) => b - a
  );
  const totalToRank = new Map<number, number>();
  uniqueTotalsDesc.forEach((tot, idx) => totalToRank.set(tot, idx + 1));

  const medalForRank = (rank: number) => {
    if (rank === 1) return "🥇 ";
    if (rank === 2) return "🥈 ";
    if (rank === 3) return "🥉 ";
    if (rank === 4) return "4️⃣ ";
    if (rank === 5) return "5️⃣ ";
    if (rank === 6) return "6️⃣ ";
    if (rank === 7) return "7️⃣ ";
    if (rank === 8) return "8️⃣ ";
    if (rank === 9) return "9️⃣ ";
    if (rank === 10) return "🔟 ";
    return ` ${rank}. `;
  };

  // Order players by total (highest first) and include the rank number
  const sortedTotals = totals.slice().sort((a, b) => b.total - a.total);
  const lines = sortedTotals.map((t) => {
    const rank = totalToRank.get(t.total) ?? 0;
    const prefix = medalForRank(rank);
    return `${prefix}${t.name}: ${t.total} Punkte`;
  });

  // Format date without seconds (localized) and add emojis to header/footer
  const dateStr = date.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const header = `🎲 Würfelkarte - Ergebnis`;
  const dateLine = `📆 ${dateStr}`;
  const gamemodeLine = `⭐ Modus: ${gamemode}`;
  const footer = `\nGespielt mit www.würfelkarte.com`;
  return [header, dateLine, gamemodeLine, "", ...lines, footer].join("\n");
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Erzeugt ein 1200x1200 PNG-Blob aus einem DOM-Layout, das aus den player-Daten gebaut wird.
 * Benötigt: npm i html-to-image
 */
export async function generateScoreImageHtmlToImage(
  players: Player[],
  gamemode: keyof typeof gamemodes,
  date = new Date(),
  logoUrl?: string
): Promise<Blob | null> {
  // helper: sanitize text for innerHTML (very small helper)
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // ensure fonts are ready (wichtig, damit Texte in der gerenderten PNG scharf/korrekt sind)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (document && (document as any).fonts && (document as any).fonts.ready) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (document as any).fonts.ready;
    } catch (e) {
      console.error(e);
    }
  }

  // build totals like in deiner bisherigen Logik
  const totals = players
    .map((p) => ({
      id: p.id,
      name: p.name,
      total: Object.values(p.points).reduce<number>(
        (s, v) => s + (typeof v === "number" ? v : 0),
        0
      ),
    }))
    .sort((a, b) => b.total - a.total);

  const volume = totals.reduce((a, b) => a + b.total, 0);
  const records = totals.filter((t) => t.total > 0).length;

  // Erstelle ein verstecktes Container-Element (off-screen)
  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  // wichtig: Position offscreen, aber im DOM, damit html-to-image alles rendern kann
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "1200px";
  wrapper.style.height = "1200px";
  wrapper.style.zIndex = "999999"; // sicher gehen

  // Inline Styles für das Layout (vermeidet Abhängigkeiten von externen CSS)
  // Wir erstellen HTML mit Inline-Styles, so ist Reproduktion zuverlässig.
  const cardHTML = `
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
        <!-- Header -->
        <div style="display: flex; align-items: center; gap: 30px;">
          <img src="/images/dice.png" alt="Dice" style="width: 80px; height: 80px; object-fit: contain;" />
          <div style="font-weight:700; font-size:90px; color:#fff;">${escapeHtml(
            String(gamemode ? capitalize(String(gamemode)) : "")
          )}</div>
        </div>

        <!-- Stats Row -->
        <!-- <div style="display:flex; gap:0; margin-top:30px; margin-bottom:40px;">
          <div style="flex:1; text-align:center;">
            <div style="font-weight:700; font-size:48px; color:#fff">—</div>
            <div style="font-size:32px; color:#c0c0c0; margin-top:8px;">Dauer</div>
          </div>
          <div style="flex:1; text-align:center;">
            <div style="font-weight:700; font-size:48px; color:#fff">${escapeHtml(
              volume.toLocaleString("de-DE")
            )}</div>
            <div style="font-size:32px; color:#c0c0c0; margin-top:8px;">Volumen</div>
          </div>
          <div style="flex:1; text-align:center;">
            <div style="font-weight:700; font-size:48px; color:#fff">${escapeHtml(
              String(records)
            )}</div>
            <div style="font-size:32px; color:#c0c0c0; margin-top:8px;">Rekorde</div>
          </div>
        </div> -->

        <!-- List -->
        <div style="margin-top:20px;">
          ${totals
            .map(
              (t) => `
            <div style="display:flex; align-items:center; gap:32px; margin-bottom:18px;">
              <div style="font-weight:700; font-size:70px; color:#fff; width:120px; margin-right:20px;">${escapeHtml(
                String(t.total)
              )}</div>
              <div style="font-weight:500; font-size:56px; color:#d7e2ec;">${escapeHtml(
                t.name
              )}</div>
            </div>
          `
            )
            .join("")}
        </div>

        <!-- Footer: logo left, date center, handle right -->
        <div style="position:absolute; left:60px; bottom:60px; color:#c0c0c0; font-weight:700; font-size:36px;">${escapeHtml(
          "würfelkarte.com"
        )}
        </div>
        <div style="position:absolute; right:60px; bottom:60px; color:#c0c0c0; font-weight:700; font-size:36px;">
          ${escapeHtml(
            date.toLocaleString("de-DE", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          )}
        </div>
      </div>
    </div>
  `;

  wrapper.innerHTML = cardHTML;
  document.body.appendChild(wrapper);

  // Wenn ein Logo-URL gegeben ist, ein <img> in #__logo_area einfügen und warten bis geladen
  const logoArea = wrapper.querySelector("#__logo_area") as HTMLElement | null;
  if (logoUrl && logoArea) {
    const img = new Image();
    // Versuch CORS, damit html-to-image in vielen Fällen die Bilddaten einbinden kann
    img.crossOrigin = "anonymous";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.objectFit = "contain";
    const logoLoadPromise = new Promise<void>((res) => {
      img.onload = () => {
        // append img (falls noch nicht durch HTML eingefügt)
        logoArea.appendChild(img);
        res();
      };
      img.onerror = () => {
        // Fallback: einfacher Text in Logo-Area
        logoArea.innerHTML =
          '<div style="color:#c0c0c0; font-weight:700;">Würfelkarte.com</div>';
        res();
      };
      img.src = logoUrl;
      // falls cached/sofort geladen, onload feuert trotzdem
    });

    await logoLoadPromise;
  } else if (logoArea) {
    // kein Logo -> Platzhalter
    logoArea.innerHTML =
      '<div style="color:#c0c0c0; font-weight:700; font-size:28px;">Würfelkarte.com</div>';
  }

  // Small delay to ensure DOM is rendered
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    // Target the inner content div instead of the wrapper
    const contentDiv = wrapper.firstElementChild as HTMLElement;
    if (!contentDiv) {
      throw new Error("Content div not found");
    }

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

    // cleanup DOM
    document.body.removeChild(wrapper);

    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    return await response.blob();
  } catch (error) {
    console.error("Failed to generate image:", error);
    // cleanup DOM in case of error
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
    return null;
  }
}

type ShareProps = {
  gamemode: keyof typeof gamemodes;
  players: Player[];
};

export const Share = ({ gamemode, players }: ShareProps) => {
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);

    try {
      // Check if Web Share API is available and supports files
      const hasWebShare = navigator && "share" in navigator;
      const supportsFiles =
        hasWebShare &&
        "canShare" in navigator &&
        navigator.canShare({ files: [new File([], "test")] });

      if (supportsFiles) {
        // Generate image only if we can share files
        const imageBlob = await generateScoreImageHtmlToImage(
          players,
          gamemode
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

          const file = new File([imageBlob], "wuerfelkarte-results.png", {
            type: "image/png",
          });
          const text = buildScoreText(players, new Date(), gamemode);

          await nav.share?.({
            title: "Würfelkarte Ergebnis",
            text,
            files: [file],
          });
          setSharing(false);
          return;
        }
      }

      // Fallback to text sharing
      const text = buildScoreText(players, new Date(), gamemode);

      if (hasWebShare) {
        type NavigatorWithShare = Navigator & {
          share?: (data: { title?: string; text?: string }) => Promise<void>;
        };
        const nav = navigator as NavigatorWithShare;
        await nav.share?.({ title: "Würfelkarte", text });
        setSharing(false);
        return;
      }

      // Final fallback: WhatsApp
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    } catch (e) {
      console.error("Sharing failed:", e);
      // Fallback to WhatsApp on any error
      const text = buildScoreText(players, new Date(), gamemode);
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
