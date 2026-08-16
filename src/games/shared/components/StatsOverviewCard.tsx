"use client";

import { useMemo } from "react";

import { formatTotalDuration } from "@/lib/utils";
import { caboStorage } from "@/games/cabo/storage";
import { flip7Storage } from "@/games/flip7/storage";
import { wizardStorage } from "@/games/wizard/storage";
import { yatzyStorage } from "@/games/yatzy/storage";
import { useMatchHistory } from "../hooks/useMatchHistory";
import { buildOverallStatsSummary } from "../stats";
import { MatchPlayer, StoredMatch } from "../types";

const BALOO = "font-[family-name:var(--font-baloo)]";

/** Totals across every game, spanning two game tiles' width on the overview page. */
export function StatsOverviewCard() {
  const yatzyMatches = useMatchHistory(yatzyStorage.loadMatches);
  const wizardMatches = useMatchHistory(wizardStorage.loadMatches);
  const flip7Matches = useMatchHistory(flip7Storage.loadMatches);
  const caboMatches = useMatchHistory(caboStorage.loadMatches);

  const summary = useMemo(() => {
    const allMatches: StoredMatch<MatchPlayer>[] = [
      ...yatzyMatches,
      ...wizardMatches,
      ...flip7Matches,
      ...caboMatches,
    ];
    return buildOverallStatsSummary(allMatches);
  }, [yatzyMatches, wizardMatches, flip7Matches, caboMatches]);

  return (
    <div className="col-span-2 grid grid-cols-3 gap-3 rounded-[20px] bg-card p-5">
      <Stat emoji="🎲" value={summary.gamesPlayed} label="Spiele" />
      <Stat
        emoji="⏱"
        value={formatTotalDuration(summary.totalDurationMs)}
        label="Spielzeit"
      />
      <Stat emoji="🔥" value={summary.weeklyStreak} label="Wochen-Serie" />
    </div>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="text-lg leading-none">{emoji}</span>
      <span className={`${BALOO} text-xl font-extrabold text-foreground`}>{value}</span>
      <span className="text-[10px] font-extrabold uppercase tracking-[.05em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
