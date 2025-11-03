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
      <div className="flex flex-wrap justify-center gap-6 my-4">
        {Object.entries(gamemodes).map(([key, mode]) => {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const isUnlocked =
            mode.price === 0 || purchased.includes(normalizedKey);
          return (
            <div key={key} className="mx-4 w-full sm:w-64">
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
              Hast du eine Idee oder einen Wunsch für neue Funktionen oder Modi?
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
