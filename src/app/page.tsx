"use client";

import { DarkModeToggle } from "@/components/DarkModeToggle";
import { games } from "@/components/games/games";
import { GameTile } from "@/components/games/GameTile";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

const PROFILE_ACTIVE = process.env.NEXT_PUBLIC_PROFILE_ACTIVE === "true";

export default function GamesOverview() {
  const router = useRouter();

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        left={
          <span
            className="text-2xl font-extrabold"
            style={{ fontFamily: "var(--font-baloo)" }}
          >
            <span className="text-foreground">tracky</span>
            <span className="text-brand-accent">.fun</span>
          </span>
        }
        right={
          <>
            {PROFILE_ACTIVE && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => router.push("/profile")}
                aria-label="Profil"
              >
                <UserRound />
              </Button>
            )}
            <DarkModeToggle />
          </>
        }
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
