"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Menu } from "@/components/Menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Dices, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PROFILE_ACTIVE = process.env.NEXT_PUBLIC_PROFILE_ACTIVE === "true";

export default function YatzyGamemodeSelect() {
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
      <div className="w-full sticky dark:bg-[#0a0a0a] bg-white h-25 right-0 top-0">
        <Card className="mx-4 p-4 flex flex-row justify-between items-center sticky top-4 z-30">
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
      <div className="flex flex-wrap justify-center gap-4 mb-4 px-4">
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
      </div>
    </>
  );
}
