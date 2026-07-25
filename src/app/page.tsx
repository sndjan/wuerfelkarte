"use client";

import { DarkModeToggle } from "@/components/DarkModeToggle";
import { games } from "@/components/games/games";
import { GameTile } from "@/components/games/GameTile";
import { PageHeader } from "@/components/PageHeader";

export default function GamesOverview() {
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
        right={<DarkModeToggle />}
      />
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {games.map((game) => (
            <GameTile key={game.key} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
}
