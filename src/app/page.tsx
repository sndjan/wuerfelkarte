"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Menu } from "@/components/Menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dices, Mail, UserRound, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PROFILE_ACTIVE = process.env.NEXT_PUBLIC_PROFILE_ACTIVE === "true";

type LastGamePlayer = {
  name: string;
  score: number;
};

type LastGame = {
  gamemode: string;
  players: LastGamePlayer[];
  timestamp: string;
};

function isLastGamePlayer(value: unknown): value is LastGamePlayer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const player = value as Record<string, unknown>;
  return typeof player.name === "string" && typeof player.score === "number";
}

function isLastGame(value: unknown): value is LastGame {
  if (!value || typeof value !== "object") {
    return false;
  }

  const game = value as Record<string, unknown>;
  return (
    typeof game.gamemode === "string" &&
    typeof game.timestamp === "string" &&
    Array.isArray(game.players) &&
    game.players.every(isLastGamePlayer)
  );
}

export default function GamemodeSelect() {
  const router = useRouter();
  const [purchased, setPurchased] = useState<string[]>([]);
  const [lastGames, setLastGames] = useState<LastGame[]>([]);

  useEffect(() => {
    const lastGamesData = localStorage.getItem("lastMatches");
    if (lastGamesData) {
      const parsed: unknown = JSON.parse(lastGamesData);
      setLastGames(Array.isArray(parsed) ? parsed.filter(isLastGame) : []);
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
      <div className="w-full sticky dark:bg-[#0a0a0a] bg-white h-25 right-0 top-0">
        <Card className="mx-4 p-4 flex flex-row justify-between items-center sticky top-4 z-30">
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
      </div>
      <div className="flex flex-wrap justify-center gap-4 mb-4 px-4 ">
        {/* Featured Multiplayer Banner */}
        <div className="w-full">
          <Card
            className="relative w-full p-6 flex flex-row items-center justify-between overflow-hidden border-0 text-white cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)" }}
            onClick={() => router.push("/multiplayer")}
          >
            <span className="absolute top-3 right-3 bg-white text-violet-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Neu
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Users size={20} />
                <h2 className="text-xl font-bold">Multiplayer</h2>
              </div>
              <p className="text-sm text-white/80 max-w-xs">
                Spiele mit Freunden online. Erstelle einen Raum oder tritt einem bestehenden Raum bei.
              </p>
            </div>
            <Button
              className="bg-white text-violet-700 hover:bg-white/90 shrink-0 ml-4 hidden sm:flex"
              onClick={(e) => { e.stopPropagation(); router.push("/multiplayer"); }}
            >
              <Users size={16} className="mr-2" />
              Spielen
            </Button>
          </Card>
        </div>

        <div key="top-10-games" className=" w-full sm:w-64">
          <Card className="h-64 w-full p-6 flex flex-col items-center justify-start overflow-hidden">
            <h2 className="text-xl font-bold">Highscores</h2>
            {lastGames.length === 0 ? (
              <div className="text-gray-500 text-sm">
                Keine Spiele gefunden.
              </div>
            ) : (
              <div className="w-full flex-1 overflow-y-auto">
                <table className="w-full text-sm text-gray-500">
                  <thead>
                    <tr>
                      <th className="text-left pr-2">Datum</th>
                      <th className="text-left pr-2">Modus</th>
                      <th className="text-left pr-2">Name</th>
                      <th className="text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastGames
                      .map((game) => {
                        const highestPlayer =
                          game.players.reduce<LastGamePlayer | null>(
                            (max, player) =>
                              player.score > (max?.score ?? 0) ? player : max,
                            null,
                          );
                        return {
                          ...game,
                          highestPlayer,
                          highestScore: highestPlayer?.score ?? 0,
                        };
                      })
                      .sort((a, b) => b.highestScore - a.highestScore)
                      .map((game, index) => {
                        const date = new Date(
                          game.timestamp,
                        ).toLocaleDateString("de-DE", {
                          month: "2-digit",
                          day: "2-digit",
                        });
                        const gamemodeChar = game.gamemode
                          .charAt(0)
                          .toUpperCase();
                        return (
                          <tr key={index}>
                            <td className="pr-2">{date}</td>
                            <td className="pr-2">{gamemodeChar}</td>
                            <td className="pr-2">
                              {game.highestPlayer?.name || "?"}
                            </td>
                            <td className="text-right">{game.highestScore}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        {Object.entries(gamemodes).map(([key, mode]) => {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const isUnlocked =
            mode.price === 0 || purchased.includes(normalizedKey);
          return (
            <div key={key} className="w-full sm:w-64">
              <Card className="h-64 w-full p-6 flex flex-col items-center justify-between">
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

        <div key="feature-request" className="w-full sm:w-64">
          <Card className="h-64 w-full p-6 flex flex-col items-center justify-between">
            <h2 className="text-xl font-bold mb-2">Idee vorschlagen</h2>
            <div className="text-gray-500 text-sm mb-2 flex-1 flex items-center justify-center text-center">
              Hast du eine Idee oder einen Wunsch für neue Funktionen? Schick
              mir eine kurze Beschreibung per E‑Mail.
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                (window.location.href = `mailto:sander.jan@gmx.net?subject=${encodeURIComponent(
                  "Feature-Anfrage: Würfelkarte",
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
