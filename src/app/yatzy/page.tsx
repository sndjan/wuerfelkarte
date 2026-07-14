"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { usePlayerRoster } from "@/components/hooks/usePlayerRoster";
import { Card } from "@/components/ui/card";
import { AddPlayerDialog } from "@/components/yatzy-lobby/AddPlayerDialog";
import { GamemodePillSelector } from "@/components/yatzy-lobby/GamemodePillSelector";
import { PlayerChip } from "@/components/yatzy-lobby/PlayerChip";
import { RecentMatchesList } from "@/components/yatzy-lobby/RecentMatchesList";
import { ArrowLeft, Dices } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PLAYER_NAMES_STORAGE_KEY = "kniffel:player-names";

export default function YatzyLobby() {
  const router = useRouter();
  const {
    roster,
    addPlayer,
    toggleActive,
    renamePlayer,
    changeEmoji,
    removePlayer,
  } = usePlayerRoster();
  const [selectedGamemode, setSelectedGamemode] = useState<
    keyof typeof gamemodes
  >(Object.keys(gamemodes)[0] as keyof typeof gamemodes);

  const activePlayers = roster.filter((player) => player.active);

  const handleStart = () => {
    if (activePlayers.length === 0) return;
    localStorage.setItem(
      PLAYER_NAMES_STORAGE_KEY,
      JSON.stringify(activePlayers.map((player) => player.name)),
    );
    router.push(`/${selectedGamemode.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
  };

  return (
    <>
      <div className="w-full sticky dark:bg-[#0a0a0a] bg-white h-25 right-0 top-0">
        <Card className="mx-4 p-4 flex flex-row items-center sticky top-4 z-30">
          <Link href="/" className="flex flex-row items-center">
            <ArrowLeft className="mr-2" size={20} />
            <Image
              src="/images/dice.png"
              alt="Dice"
              width={512}
              height={512}
              className="w-8 h-8"
            />
            <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl">
              Yatzy
            </h1>
          </Link>
        </Card>
      </div>
      <div className="flex flex-col gap-6 px-4 pb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Spieler
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {roster.map((player) => (
              <PlayerChip
                key={player.id}
                player={player}
                onToggleActive={toggleActive}
                onRename={renamePlayer}
                onChangeEmoji={changeEmoji}
                onRemove={removePlayer}
              />
            ))}
            <AddPlayerDialog onAdd={addPlayer} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Spielmodus
          </h2>
          <GamemodePillSelector
            value={selectedGamemode}
            onChange={(key) =>
              setSelectedGamemode(key as keyof typeof gamemodes)
            }
          />
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={activePlayers.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Dices size={20} />
          Spiel starten
        </button>

        <RecentMatchesList />
      </div>
    </>
  );
}
