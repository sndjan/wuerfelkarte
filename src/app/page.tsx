"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { TipOfTheDay } from "@/blog/components/TipOfTheDay";
import { AccountButton } from "@/components/account/AccountButton";
import { InstallPwaBanner } from "@/components/common/InstallPwaBanner";
import { PageHeader } from "@/components/common/PageHeader";
import { CompactTile, HeroTile, ModeTile } from "@/games/HomeTiles";
import { OnlineBanner } from "@/games/online/components/OnlineBanner";
import { games } from "@/games/registry";
import { loadRunningGames } from "@/games/runningGames";
import { ResumeGameCard } from "@/games/shared/components/ResumeGameCard";
import { StatsOverviewCard } from "@/games/shared/components/StatsOverviewCard";
import { useRunningGames } from "@/games/shared/hooks/useRunningGames";

const MODE_KEYS = ["online", "quiz", "training", "speedrun"];
const byKey = (key: string) => games.find((game) => game.key === key)!;

/** Running games shown before the rest fold away behind "+N weitere". */
const RESUME_VISIBLE = 2;

/**
 * Home: the Würfelkarte first and large, its four modes below, then the
 * statistics strip and the other games small. On an iPad the modes take the
 * left column and everything else the right one, so nothing scrolls.
 */
export default function GamesOverview() {
  const { running: runningGames, discard } = useRunningGames(loadRunningGames);
  const [showAllRunning, setShowAllRunning] = useState(false);
  const hiddenRunning = showAllRunning ? 0 : Math.max(0, runningGames.length - RESUME_VISIBLE);
  const others = games.filter(
    (game) => !game.locked && game.key !== "yatzy" && !MODE_KEYS.includes(game.key),
  );

  return (
    <div className="wk min-h-full bg-background">
      <PageHeader
        left={
          <span className="wk-wordmark">
            würfelkarte<b>.com</b>
          </span>
        }
        right={<AccountButton />}
      />
      <InstallPwaBanner />
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-8 md:grid md:min-h-[calc(100dvh-80px)] md:max-w-[1180px] md:grid-cols-[minmax(0,1fr)_380px] md:gap-8 md:px-8">
        <section className="wk-section md:flex-1">
          <h2 className="wk-overline hidden md:block">Würfelkarte</h2>
          <div className="wk-tiles md:flex-1 md:grid-rows-[1.1fr_1fr_1fr]">
            <HeroTile game={byKey("yatzy")} />
            {MODE_KEYS.map((key) => (
              <ModeTile key={key} game={byKey(key)} />
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-5 md:gap-6">
          <OnlineBanner />
          {runningGames.length > 0 && (
            <section className="wk-section">
              <h2 className="wk-overline">Weiterspielen</h2>
              {runningGames.slice(0, runningGames.length - hiddenRunning).map((game) => (
                <ResumeGameCard key={game.gameKey} game={game} showGameName onDiscard={discard} />
              ))}
              {hiddenRunning > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllRunning(true)}
                  className="flex items-center justify-center gap-1 self-center rounded-full px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-secondary"
                >
                  +{hiddenRunning} {hiddenRunning === 1 ? "weiteres" : "weitere"}
                  <ChevronDown className="size-4" aria-hidden="true" />
                </button>
              )}
            </section>
          )}
          <TipOfTheDay />
          <StatsOverviewCard />
          <section className="wk-section">
            <h2 className="wk-overline">Weitere Spiele</h2>
            <div className="wk-tiles gap-3">
              {others.map((game) => (
                <CompactTile key={game.key} game={game} />
              ))}
            </div>
          </section>
          <div className="flex items-center justify-center gap-1">
            <Link
              href="/regeln"
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              <BookOpen className="size-4" aria-hidden="true" />
              Spielregeln
            </Link>
            <Link
              href="/blog"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Blog
            </Link>
            <Link
              href="/scan"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Papierblock
            </Link>
            <Link
              href="/lizenzen"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Lizenzen
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
