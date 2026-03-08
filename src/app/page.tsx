"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Menu } from "@/components/Menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dices, Mail, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PROFILE_ACTIVE = process.env.NEXT_PUBLIC_PROFILE_ACTIVE === "true";

export default function GamemodeSelect() {
  const router = useRouter();
  const [purchased, setPurchased] = useState<string[]>([]);
  const [lastGames, setLastGames] = useState<{ gamemode: string; players: string[]; timestamp: string }[]>([]);

  useEffect(() => {
    const lastGamesData = localStorage.getItem("lastMatches");
    console.log("Last matches data from localStorage:", lastGamesData);
    if (lastGamesData) {
      const parsed = JSON.parse(lastGamesData);
      setLastGames(Array.isArray(parsed) ? parsed : []);
    } else {
      setLastGames([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const bought = localStorage.getItem("purchasedGamemodes");
      setPurchased(bought ? JSON.parse(bought) : ["Klassiker"]);
    }
  }, []);

  const handlePlay = (key: string, price: number) => {
    if (
      price === 0 ||
      purchased.includes(key.toLowerCase().replace(/[^a-z0-9]/g, ""))
    ) {
      router.push(`/${key.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
    } else {
      router.push(`/checkout/${key.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
    }
  };

  return (
    <>
      <Card className="m-4 p-4 flex flex-row justify-between items-center sticky top-4 z-30">
        <Link href="/" className="flex flex-row items-center">
          <Image
            src="/images/dice.png"
            alt="Dice"
            width={512}
            height={512}
            className="w-8 h-8"
          />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl">
            Würfelkarte
          </h1>
        </Link>
        <div className="flex flex-row gap-4">
          {PROFILE_ACTIVE && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/profile")}
              aria-label="Profil"
            >
              <UserRound />
            </Button>
          )}
          <Menu />
        </div>
      </Card>
        <div className="flex flex-wrap justify-center gap-4 my-4 px-4">
      <div key="top-10-games" className=" w-full sm:w-64">
          <Card className="h-64 w-full p-6 flex flex-col items-center justify-start overflow-hidden">
        <h2 className="text-xl font-bold">Highscores</h2>
        {lastGames.length === 0 ? (
          <div className="text-gray-500 text-sm">Keine Spiele gefunden.</div>
        ) : (
          <div className="w-full flex-1 overflow-y-auto text-gray-500">
            {lastGames
              .map((game: any) => {
                const highestPlayer = game.players?.reduce((max: any, player: any) => 
                  (player.score > (max?.score || 0)) ? player : max, null);
                return {
                  ...game,
                  highestPlayer,
                  highestScore: highestPlayer?.score || 0
                };
              })
              .sort((a, b) => b.highestScore - a.highestScore)
              .map((game: any, index) => {
                const date = new Date(game.timestamp).toLocaleDateString("de-DE", {
                  month: "2-digit",
                  day: "2-digit"
                });
                
                return (
                  <div key={index} className="w-full flex justify-between items-center mb-1 text-sm">
                    <div>{date}</div>
                    <div>{game.highestPlayer?.name || "?"}</div>
                    <div>{game.highestScore}</div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
      </div>
        {Object.entries(gamemodes).map(([key, mode]) => {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const isUnlocked =
            mode.price === 0 || purchased.includes(normalizedKey);
          return (
            <div key={key} className=" w-full sm:w-64">
              <Card
                className={`h-64 w-full p-6 flex flex-col items-center justify-between`}
              >
                <h2 className="text-xl font-bold mb-2">{mode.name}</h2>
                <div className="text-gray-500 text-sm mb-2 flex-1 flex items-center justify-center text-center">
                  {mode.description}
                </div>
                <Button
                  variant={isUnlocked ? "outline" : "default"}
                  className="w-full"
                  onClick={() => handlePlay(key, mode.price ?? 0)}
                  disabled={false}
                >
                  <Dices size={20} className="mr-2" />
                  {isUnlocked
                    ? "Spielen"
                    : `${mode.price?.toFixed(2) ?? ""} € freischalten`}
                </Button>
              </Card>
            </div>
          );
        })}
        <div key="feature-request" className="mx-4 w-full sm:w-64">
          <Card className="h-64 w-full p-6 flex flex-col items-center justify-between">
            <h2 className="text-xl font-bold mb-2">Idee vorschlagen</h2>
            <div className="text-gray-500 text-sm mb-2 flex-1 flex items-center justify-center text-center">
              Hast du eine Idee oder einen Wunsch für neue Funktionen?
              Schick mir eine kurze Beschreibung per E‑Mail.
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                (window.location.href = `mailto:sander.jan@gmx.net?subject=${encodeURIComponent(
                  "Feature-Anfrage: Würfelkarte"
                )}`)
              }
              aria-label="Feature anfragen per E-Mail"
            >
              <Mail size={20} className="mr-2" />
              Mail schicken
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
