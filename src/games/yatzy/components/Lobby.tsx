"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GamemodePills } from "@/games/shared/components/GamemodePills";
import { GamemodeStats } from "@/games/shared/components/GamemodeStats";
import { LobbySection, LobbyShell } from "@/games/shared/components/LobbyShell";
import { RecentMatches } from "@/games/shared/components/RecentMatches";
import { useMatchHistory } from "@/games/shared/hooks/useMatchHistory";
import { YATZY_EMOJI, buildStats, gamemodeSlug } from "../config";
import { gamemodes } from "../gamemodes";
import { savePlayers, yatzyStorage } from "../storage";

/** Yatzy has no upper limit — everyone who fits around the table can play. */
const MIN_PLAYERS = 1;
const MAX_PLAYERS = 99;

export function Lobby() {
  const router = useRouter();
  const [selectedGamemode, setSelectedGamemode] = useState<
    keyof typeof gamemodes
  >(Object.keys(gamemodes)[0]);
  const history = useMatchHistory(yatzyStorage.loadMatches);

  return (
    <LobbyShell
      title="Yatzy"
      emoji={YATZY_EMOJI}
      minPlayers={MIN_PLAYERS}
      maxPlayers={MAX_PLAYERS}
      onStart={(selected) => {
        savePlayers(
          selected.map((player) => ({
            name: player.name,
            emoji: player.emoji,
          })),
        );
        router.push(`/yatzy/${gamemodeSlug(selectedGamemode)}`);
      }}
      footer={
        <>
          <GamemodeStats
            matches={history.filter((m) => m.gamemode === selectedGamemode)}
            buildStats={buildStats}
          />
          <RecentMatches
            matches={history}
            modeName={(match) =>
              gamemodes[match.gamemode]?.name ?? match.gamemode
            }
          />
        </>
      }
    >
      {() => (
        <LobbySection title="Spielmodus">
          <GamemodePills
            gamemodes={gamemodes}
            value={selectedGamemode}
            onChange={setSelectedGamemode}
          />
          {gamemodes[selectedGamemode].description && (
            <p className="text-sm text-muted-foreground">
              {gamemodes[selectedGamemode].description}
            </p>
          )}
          {gamemodes[selectedGamemode].information && (
            <Dialog>
              <DialogTrigger className="flex items-center gap-1.5 self-start text-sm font-semibold text-brand-accent">
                <Info className="size-3.5" />
                Regeln anzeigen
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Infos zum Spielmodus</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  {gamemodes[selectedGamemode].information?.[0]}
                </DialogDescription>
                <div className="grid grid-cols-1 gap-4">
                  {gamemodes[selectedGamemode].information
                    ?.slice(1)
                    .map((info, index) => (
                      <p key={index} className="text-sm">
                        {info}
                      </p>
                    ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </LobbySection>
      )}
    </LobbyShell>
  );
}
