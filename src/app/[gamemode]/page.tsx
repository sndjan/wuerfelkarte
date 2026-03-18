"use client";

import AddPlayer from "@/components/AddPlayer";
import GamemodeInfo from "@/components/GamemodeInfo";
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Points } from "@/components/hooks/types";
import { useKniffel } from "@/components/hooks/useKniffel";
import { Menu } from "@/components/Menu";
import PlayerCard from "@/components/PlayerCard";
import ResetGame from "@/components/ResetGame";
import { Scoring } from "@/components/Scoring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy, UserRoundPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/hooks/useTheme";
import {
  Mission,
  missions as chaosMissions,
} from "@/components/gamemodes/chaoswunder";
import { toast } from "sonner";

export type Theme = "none" | "Halloween" | "Christmas" | "Easter";
const CHAOS_ROUND_INTERVAL = 2;

export default function Home() {
  const params = useParams();
  const router = useRouter();
  const param = (params.gamemode as string) || "";
  const gamemode =
    (Object.keys(gamemodes).find(
      (key) =>
        key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ===
        param.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
    ) as keyof typeof gamemodes) || "SuperWurf";

  const [purchased, setPurchased] = useState<string[] | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0);
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
  const { theme, isThemeActive, setIsThemeActive } = useTheme();

  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevMissionIndexRef = useRef<number>(-1);

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
    if (gamemode === "Chaoswunder") {
      setCurrentMissionIndex(0);
      prevMissionIndexRef.current = -1;
      setMissions(
        [...chaosMissions]
          .sort(() => Math.random() - 0.5)
          .slice(0, 14 / CHAOS_ROUND_INTERVAL),
      );
      return;
    }

    setCurrentMissionIndex(0);
    setMissions([]);
  }, [gamemode]);

  useEffect(() => {
    if (
      gamemode !== "Chaoswunder" ||
      missions.length === 0 ||
      players.length === 0
    ) {
      return;
    }

    const roundsPlayed = Math.min(
      ...players.map(
        (player) =>
          Object.values(player.points).filter((point) => point !== 0).length,
      ),
    );

    const newIndex = Math.min(
      Math.floor(roundsPlayed / CHAOS_ROUND_INTERVAL),
      missions.length - 1,
    );
    setCurrentMissionIndex(newIndex);
    if (
      newIndex > prevMissionIndexRef.current &&
      prevMissionIndexRef.current !== -1
    ) {
      toast.warning(`Mission ${newIndex + 1} ist aktiv!`);
    }
    prevMissionIndexRef.current = newIndex;
  }, [gamemode, missions.length, players]);

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
        Object.values(player.points).every((point) => point !== 0),
      ),
    [players],
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
          <Image
            src="/images/dice.png"
            alt="Dice"
            width={512}
            height={512}
            className="w-8 h-8"
          />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl mr-4">
            {gamemodes[gamemode].name}
          </h1>
        </Link>
        <div className="flex flex-row">
          <Scoring players={players} gamemode={gamemode}>
            <Button
              variant="outline"
              className={`mr-4  ${
                gameFinished
                  ? "dark:bg-yellow-400 bg-yellow-400 hover:bg-yellow-500 dark:text-black"
                  : ""
              }`}
            >
              <Trophy />
              <span className="hidden sm:block">Punkteauswertung</span>
            </Button>
          </Scoring>
          <div className="mr-4 hidden sm:block">
            <AddPlayer addPlayer={addPlayer}>
              <Button variant="outline">
                <UserRoundPlus />
              </Button>
            </AddPlayer>
          </div>
          <div className="mr-4 hidden sm:block">
            <ResetGame resetAllPoints={resetAllPoints}>
              <Button variant="outline">
                <RotateCcw />
              </Button>
            </ResetGame>
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
            resetAll={resetAll}
            resetAllPoints={resetAllPoints}
            addPlayer={addPlayer}
            specialTheme={theme}
            isThemeActive={isThemeActive}
            setIsThemeActive={setIsThemeActive}
          />
        </div>
      </Card>
      <div
        className="px-4 pb-24 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: "none" }}
        id="player-container"
      >
        {gamemode === "Chaoswunder" && missions.length > 0 && (
          <Card className="p-4 mb-4 flex flex-col justify-between items-center space-y-[-15px] h-full relative overflow-clip">
            <h2 className="text-lg font-bold">
              Mission {currentMissionIndex + 1}/{missions.length}
            </h2>
            <div className="flex flex-col items-center">
              <p className="text-sm text-center">
                <span className="font-bold">Würfelart:</span>{" "}
                {missions[currentMissionIndex].diceRule}
              </p>
              <p className="text-sm text-center">
                <span className="font-bold">Beschränkung:</span>{" "}
                {missions[currentMissionIndex].restriction}
              </p>
            </div>
          </Card>
        )}
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
