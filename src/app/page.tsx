"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { InstallPwaBanner } from "@/components/common/InstallPwaBanner";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { StatsOverviewCard } from "@/games/shared/components/StatsOverviewCard";
import { games } from "@/games/registry";
import { GameTile } from "@/games/GameTile";

const matchesQuery = (game: (typeof games)[number], query: string): boolean => {
  const haystack = [game.name, ...(game.alternativeNames ?? [])];
  return haystack.some((name) => name.toLowerCase().includes(query));
};

export default function GamesOverview() {
  const [query, setQuery] = useState("");

  const visibleGames = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return games;
    return games.filter((game) => matchesQuery(game, normalized));
  }, [query]);

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        left={
          <span
            className="text-2xl font-extrabold"
            style={{ fontFamily: "var(--font-baloo)" }}
          >
            <span className="text-foreground">würfelkarte</span>
            <span className="text-brand-accent">.com</span>
          </span>
        }
      />
      <InstallPwaBanner />
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Spiel suchen..."
            className="rounded-full bg-card pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {!query.trim() && <StatsOverviewCard />}
          {visibleGames.map((game) => (
            <GameTile key={game.key} game={game} />
          ))}
          {visibleGames.length === 0 && (
            <p className="col-span-2 py-6 text-center text-sm text-muted-foreground">
              Kein Spiel gefunden.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
