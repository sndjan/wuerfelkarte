"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dices, LogIn, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

const PLAYER_KEY_STORAGE = "kniffel:player-key";

function getOrCreatePlayerKey(): string {
  try {
    const stored = localStorage.getItem(PLAYER_KEY_STORAGE);
    if (stored && /^[0-9a-f-]{36}$/.test(stored)) return stored;
    const key = crypto.randomUUID();
    localStorage.setItem(PLAYER_KEY_STORAGE, key);
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

export default function MultiplayerLobbyPage() {
  return (
    <Suspense>
      <MultiplayerLobby />
    </Suspense>
  );
}

function MultiplayerLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [createName, setCreateName] = useState("");
  const [createGamemode, setCreateGamemode] = useState(
    Object.keys(gamemodes)[0]
  );
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState(
    (searchParams.get("code") ?? "").replace(/[^0-9]/g, "").slice(0, 5)
  );
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);

  const gamemodeOptions = useMemo(() => Object.keys(gamemodes), []);

  async function handleCreate() {
    const name = createName.trim().slice(0, 30);
    if (!name) {
      toast.error("Bitte Namen eingeben.");
      return;
    }
    setCreating(true);
    try {
      const playerKey = getOrCreatePlayerKey();
      const res = await fetch("/api/multiplayer/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gamemode: createGamemode, playerName: name, playerKey }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "Raum konnte nicht erstellt werden.");
        return;
      }
      const { roomCode } = await res.json();
      router.push(`/multiplayer/${roomCode}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    const name = joinName.trim().slice(0, 30);
    const code = joinCode.trim().replace(/[^0-9]/g, "");

    if (!name) {
      toast.error("Bitte Namen eingeben.");
      return;
    }
    if (code.length !== 5) {
      toast.error("Bitte gültigen 5-stelligen Raumcode eingeben.");
      return;
    }

    setJoining(true);
    try {
      const playerKey = getOrCreatePlayerKey();
      const res = await fetch(`/api/multiplayer/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name, playerKey }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "Beitreten fehlgeschlagen.");
        return;
      }
      router.push(`/multiplayer/${code}`);
    } finally {
      setJoining(false);
    }
  }

  return (
    <>
      <Card className="m-4 p-4 flex flex-row justify-between items-center">
        <Link href="/" className="flex flex-row items-center">
          <Image
            src="/images/dice.png"
            alt="Dice"
            width={512}
            height={512}
            className="w-8 h-8"
          />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl">
            Multiplayer
          </h1>
        </Link>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 px-4 pb-8">
        {/* Join room */}
        <Card className="flex-1 p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LogIn size={20} /> Raum beitreten
          </h2>
          <p className="text-sm text-muted-foreground">
            Gib den Code ein, den dir der Host mitgeteilt hat.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Dein Name</label>
              <Input
                placeholder="Name eingeben"
                value={joinName}
                maxLength={30}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoin();
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Raumcode</label>
              <Input
                placeholder="z.B. 48291"
                value={joinCode}
                maxLength={5}
                onChange={(e) =>
                  setJoinCode(e.target.value.replace(/[^0-9]/g, ""))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoin();
                }}
                className="font-mono tracking-widest"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleJoin}
              disabled={joining}
              className="w-full"
            >
              <LogIn size={16} className="mr-2" />
              {joining ? "Beitreten..." : "Beitreten"}
            </Button>
          </div>
        </Card>

        {/* Create room */}
        <Card className="flex-1 p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Plus size={20} /> Raum erstellen
          </h2>
          <p className="text-sm text-muted-foreground">
            Erstelle einen Raum und teile den Code mit deinen Mitspielern.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Dein Name</label>
              <Input
                placeholder="Name eingeben"
                value={createName}
                maxLength={30}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Spielmodus</label>
              <Select value={createGamemode} onValueChange={setCreateGamemode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gamemodeOptions.map((key) => (
                    <SelectItem key={key} value={key}>
                      {gamemodes[key as keyof typeof gamemodes].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              <Dices size={16} className="mr-2" />
              {creating ? "Erstelle..." : "Raum erstellen"}
            </Button>
          </div>
        </Card>

      </div>
    </>
  );
}
