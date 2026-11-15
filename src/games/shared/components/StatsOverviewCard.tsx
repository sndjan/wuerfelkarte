"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { formatTotalDuration } from "@/lib/utils";
import { useAllMatches } from "../hooks/useAllMatches";
import { buildOverallStatsSummary } from "../stats";

/** Totals across every game (StatStrip); tapping it opens /statistik. */
export function StatsOverviewCard() {
  const summary = buildOverallStatsSummary(useAllMatches());

  return (
    <section className="wk-section">
      <div className="wkx-head">
        <h2 className="wk-overline">Statistik</h2>
        <Link href="/statistik" className="wkx-link">
          Ansehen
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <Link href="/statistik" className="wk-stats" aria-label="Statistik ansehen">
        <div className="wk-stat">
          <b>{summary.gamesPlayed}</b>
          <span>Spiele</span>
        </div>
        <div className="wk-stat">
          <b>{formatTotalDuration(summary.totalDurationMs)}</b>
          <span>Spielzeit</span>
        </div>
        <div className="wk-stat">
          <b>{summary.weeklyStreak}</b>
          <span>Wochen-Serie</span>
        </div>
      </Link>
    </section>
  );
}
