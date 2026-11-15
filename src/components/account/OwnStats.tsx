"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { useMatchHistory } from "@/games/shared/hooks/useMatchHistory";
import { playerSummary } from "@/games/shared/playerStats";
import type { MatchPlayer, StoredMatch } from "@/games/shared/types";
import { yatzyStorage } from "@/games/yatzy/storage";

/** The user's own Würfelkarte numbers on the profile; tapping opens /statistik with them picked. */
export function OwnStats({ name }: { name: string | null }) {
  const matches = useMatchHistory(yatzyStorage.loadMatches as () => StoredMatch<MatchPlayer>[]);
  if (!name) return null;
  const summary = playerSummary(name, matches);
  const href = `/statistik?spieler=${encodeURIComponent(name)}`;
  return (
    <section className="wk-section">
      <div className="wkx-head">
        <h3 className="wk-overline">Statistik</h3>
        <Link href={href} className="wkx-link">
          Ansehen
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <Link href={href} className="wk-stats" aria-label="Deine Statistik ansehen">
        <div className="wk-stat">
          <b>{summary.games}</b>
          <span>Spiele</span>
        </div>
        <div className="wk-stat">
          <b>{summary.wins}</b>
          <span>Siege</span>
        </div>
        <div className="wk-stat">
          <b>{summary.highscore ?? "–"}</b>
          <span>Highscore</span>
        </div>
      </Link>
    </section>
  );
}
