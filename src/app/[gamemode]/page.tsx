"use client";

import AddPlayer from "@/components/AddPlayer";
import GamemodeInfo from "@/components/GamemodeInfo";
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Points } from "@/components/hooks/types";
import { useKniffel } from "@/components/hooks/useKniffel";
import { Menu } from "@/components/Menu";
import PlayerCard from "@/components/PlayerCard";
import { Scoring } from "@/components/Scoring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Library, Trophy, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function Home() {
  const params = useParams();
  const router = useRouter();
  const param = (params.gamemode as string) || "";
  const gamemode =
    (Object.keys(gamemodes).find(
      (key) =>
        key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ===
        param.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    ) as keyof typeof gamemodes) || "SuperWurf";

  const [isThemeActive, setIsThemeActive] = useState(false);
  const now = new Date();
  const isHalloween =
    (now.getMonth() === 9 && now.getDate() >= 27) ||
    (now.getMonth() === 10 && now.getDate() <= 2);
  const theme: "Halloween" | "none" = isHalloween ? "Halloween" : "none";

  // Always call hooks at the top
  const [purchased, setPurchased] = useState<string[] | null>(null);
  const [showScoring, setShowScoring] = useState(false);
  const {
    players,
    addPlayer,
    updatePoints,
    resetPoints,
    removePlayer,
    changeName,
    moveToRight,
    moveToLeft,
    resetAll,
    resetAllPoints,
  } = useKniffel(gamemode);

  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = document.getElementById("player-container");
    if (container) {
      container.scrollTo({
        left: 0,
        behavior: "auto",
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const bought = localStorage.getItem("purchasedGamemodes");
      setPurchased(bought ? JSON.parse(bought) : ["Klassiker"]);
    }
  }, []);

  useEffect(() => {
    if (purchased === null) return;
    const normalizedKey = param.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const modePrice = gamemodes[gamemode]?.price ?? 0;
    const isUnlocked = modePrice === 0 || purchased.includes(normalizedKey);
    if (!isUnlocked) {
      router.replace(`/checkout/${normalizedKey}`);
    }
  }, [purchased, param, gamemode, router]);

  const handleUpdatePoints = (playerId: number, points: Partial<Points>) => {
    const currentIndex = players.findIndex((player) => player.id === playerId);
    updatePoints(playerId, points);

    setTimeout(() => {
      const nextIndex = (currentIndex + 1) % players.length;

      const container = document.getElementById("player-container");
      const targetElement = playerRefs.current[nextIndex];

      if (container && targetElement) {
        const scrollPosition =
          targetElement.offsetLeft -
          container.offsetLeft -
          container.clientWidth / 2 +
          targetElement.offsetWidth / 2;

        container.scrollTo({
          left: scrollPosition,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const gameFinished = useMemo(
    () =>
      players.every((player) =>
        Object.values(player.points).every((point) => point !== 0)
      ),
    [players]
  );

  if (purchased === null) {
    return null;
  }
  const normalizedKey = param.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const modePrice = gamemodes[gamemode]?.price ?? 0;
  const isUnlocked = modePrice === 0 || purchased.includes(normalizedKey);
  if (!isUnlocked) {
    return null;
  }

  return (
    <>
      <Card className="m-4 p-4 flex flex-row justify-between items-center top-4 z-10 bg-background">
        <Link href="/" className="flex flex-row ">
          <Library size={32} />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl mr-4">
            {gamemodes[gamemode].name}
          </h1>
        </Link>
        <div className="flex flex-row">
          <Button
            variant="outline"
            className={`mr-4  ${
              gameFinished
                ? "dark:bg-yellow-400 bg-yellow-400 hover:bg-yellow-500 dark:text-black"
                : ""
            }`}
            onClick={() => setShowScoring(true)}
          >
            <Trophy />
            <span className="hidden sm:block">Punkteauswertung</span>
            <Scoring
              players={players}
              open={showScoring}
              onOpenChange={(value) => setShowScoring(value)}
              gamemode={gamemode}
            />
          </Button>
          <div className="mr-4 hidden sm:block">
            <AddPlayer addPlayer={addPlayer}>
              <Button variant="outline">
                <UserRoundPlus />
              </Button>
            </AddPlayer>
          </div>
          {gamemodes[gamemode].information && (
            <div className="mr-4 hidden sm:block">
              <GamemodeInfo gamemodeInfo={gamemodes[gamemode].information} />
            </div>
          )}
          {/* <div className="hidden sm:block flex-row mr-4">
            <ModeToggle />
          </div> */}
          <Menu
            players={players}
            resetAll={resetAll}
            resetAllPoints={resetAllPoints}
            open={showScoring}
            onOpenChange={setShowScoring}
            addPlayer={addPlayer}
            specialTheme={theme}
            isThemeActive={isThemeActive}
            setIsThemeActive={setIsThemeActive}
            gamemode={gamemode}
          />
        </div>
      </Card>
      <div
        className="px-4 pb-24 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: "none" }}
        id="player-container"
      >
        <div
          className={`flex flex-row gap-4 ${
            players.length > 2 ? "min-w-max" : ""
          }`}
        >
          {players.map((player, index) => {
            return (
              <div
                className="snap-center"
                key={index}
                ref={(el) => {
                  playerRefs.current[index] = el;
                }}
                style={{ width: "calc(50% - 8px)" }}
              >
                <PlayerCard
                  playerName={player.name}
                  playerPoints={player.points}
                  updatePoints={(points: Partial<Points>) =>
                    handleUpdatePoints(player.id, points)
                  }
                  resetPoints={() => resetPoints(player.id)}
                  removePlayer={() => removePlayer(player.id)}
                  changeName={(name) => changeName(player.id, name)}
                  moveToRight={() => moveToRight(player.id)}
                  moveToLeft={() => moveToLeft(player.id)}
                  gamemode={gamemode}
                  theme={theme}
                  isThemeActive={isThemeActive}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
