import { Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { gamemodes } from "./gamemodes/gamemodes";
import { Player } from "./hooks/types";
import { useState } from "react";

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

type ShareProps = {
  gamemode: keyof typeof gamemodes;
  players: Player[];
};

export const Share = ({ gamemode, players }: ShareProps) => {
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);

    const text = buildScoreText(players, new Date(), gamemode);

    // Try Web Share API first
    try {
      if (navigator && "share" in navigator) {
        type NavigatorWithShare = Navigator & {
          share?: (data: {
            title?: string;
            text?: string;
            url?: string;
          }) => Promise<void>;
        };
        const nav = navigator as NavigatorWithShare;
        await nav.share?.({ title: "Würfelkarte", text });
        setSharing(false);
        return;
      }
    } catch (e) {
      // ignore and fallback
      console.error("Web Share failed:", e);
    }

    // Fallback: open WhatsApp web (works on mobile & desktop if installed)
    try {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
      setSharing(false);
      return;
    } catch (e) {
      console.error("WhatsApp share failed:", e);
    }

    setSharing(false);
  };

  return (
    <Button onClick={onShare} disabled={sharing} variant="secondary" size="sm">
      <Share2 /> {sharing ? "Teilen…" : "Teilen"}
    </Button>
  );
};
