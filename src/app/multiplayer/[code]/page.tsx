"use client";

import {
  Mission,
  missions as chaosMissions,
} from "@/components/gamemodes/chaoswunder";
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Points } from "@/components/hooks/types";
import { useMultiplayerGame } from "@/components/hooks/useMultiplayerGame";
import { useTheme } from "@/components/hooks/useTheme";
import PlayerCard from "@/components/PlayerCard";
import { Scoring } from "@/components/Scoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle,
  Circle,
  Construction,
  Dices,
  Loader2,
  Share2,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

// Deterministic shuffle using the room ID as a seed so all clients generate
// the same mission order without storing missions in the database.
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function () {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rng = seededRandom(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function MultiplayerGame() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const {
    room,
    players,
    myPlayerKey,
    isHost,
    isLoading,
    error,
    updateMyPoints,
    startGame,
  } = useMultiplayerGame(code);

  const { theme, isThemeActive } = useTheme();
  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const gamemode = room?.gamemode as keyof typeof gamemodes | undefined;

  // Chaos missions — deterministic from room ID so all clients agree
  const missions = useMemo<Mission[]>(() => {
    if (!room || room.gamemode !== "Chaoswunder") return [];
    const missionCount = 7; // every 2 rounds, standard
    return seededShuffle(chaosMissions, room.id).slice(0, missionCount);
  }, [room]);

  const chaosRoundsPlayed = useMemo(() => {
    if (room?.gamemode !== "Chaoswunder" || players.length === 0) return 0;
    return Math.min(
      ...players.map(
        (p) => Object.values(p.points).filter((v) => v !== 0).length,
      ),
    );
  }, [room?.gamemode, players]);

  const currentMissionIndex = useMemo(() => {
    if (missions.length === 0) return 0;
    return Math.min(Math.floor(chaosRoundsPlayed / 2), missions.length - 1);
  }, [missions.length, chaosRoundsPlayed]);

  const gameFinished = useMemo(() => {
    if (!gamemode || players.length === 0) return false;
    const fields = gamemodes[gamemode]?.fields.map((f) => f.key) ?? [];
    return players.every((p) =>
      fields.every((key) => {
        const val = p.points[key];
        return val !== undefined && val !== 0;
      }),
    );
  }, [players, gamemode]);

  // Scroll to own card when game starts
  useEffect(() => {
    if (room?.status !== "playing") return;
    const myIndex = players.findIndex((p) => p.player_key === myPlayerKey);
    if (myIndex < 0) return;
    const container = document.getElementById("player-container");
    const el = playerRefs.current[myIndex];
    if (container && el) {
      container.scrollTo({
        left:
          el.offsetLeft -
          container.offsetLeft -
          container.clientWidth / 2 +
          el.offsetWidth / 2,
        behavior: "smooth",
      });
    }
  }, [room?.status]);

  function shareRoom() {
    const url = `${window.location.origin}/multiplayer?code=${code}`;
    if (navigator.share) {
      navigator
        .share({
          title: "Wunder Multiplayer",
          text: `Tritt meinem Wunder-Spiel bei! Code: ${code}`,
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Link kopiert!"));
    }
  }

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin mr-2" />
        <span>Lade Raum…</span>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-destructive font-semibold">
          {error ?? "Raum nicht gefunden."}
        </p>
        <Link href="/multiplayer">
          <Button variant="outline">Zurück</Button>
        </Link>
      </div>
    );
  }

  // ── Lobby ───────────────────────────────────────────────────────────────────
  if (room.status === "lobby") {
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
              {gamemodes[room.gamemode as keyof typeof gamemodes]?.name ??
                room.gamemode}
            </h1>
          </Link>
        </Card>

        <div className="px-4 flex flex-col gap-4 max-w-md mx-auto">
          {/* Room code */}
          <Card className="p-6 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">Raumcode</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-mono font-extrabold tracking-widest">
                {code}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={shareRoom}
                aria-label="Raum teilen"
              >
                <Share2 size={20} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Teile diesen Code mit deinen Mitspielern.
            </p>
          </Card>

          {/* Player list */}
          <Card className="p-4 flex flex-col gap-2">
            <h2 className="font-semibold flex items-center gap-2">
              <Users size={16} /> Spieler ({players.length}/6)
            </h2>
            {players.map((p) => (
              <div
                key={p.player_key}
                className="flex items-center gap-2 text-sm"
              >
                {p.player_key === myPlayerKey ? (
                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                ) : (
                  <Circle
                    size={14}
                    className="text-muted-foreground shrink-0"
                  />
                )}
                <span>{p.name}</span>
                {p.player_key === room.host_player_key && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    Host
                  </Badge>
                )}
                {p.player_key === myPlayerKey &&
                  p.player_key !== room.host_player_key && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      Du
                    </Badge>
                  )}
              </div>
            ))}
          </Card>

          {/* Start / waiting */}
          {isHost ? (
            <Button
              onClick={startGame}
              disabled={players.length < 2}
              className="w-full"
            >
              <Dices size={16} className="mr-2" />
              {players.length < 2 ? "Warte auf Mitspieler…" : "Spiel starten"}
            </Button>
          ) : (
            <Card className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
              <Loader2 className="animate-spin inline mr-2" size={14} />
              Warte auf den Host…
            </Card>
          )}
        </div>
      </>
    );
  }

  // ── Game ────────────────────────────────────────────────────────────────────
  const scoringPlayers = players.map((p, i) => ({
    id: i,
    name: p.name,
    points: p.points as Points,
    score: p.score,
  }));

  return (
    <>
      <Card className="m-4 p-4 flex flex-row justify-between items-center top-4 z-10">
        <Link href="/" className="flex flex-row items-center">
          <Image
            src="/images/dice.png"
            alt="Dice"
            width={512}
            height={512}
            className="w-8 h-8"
          />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl mr-4">
            {gamemodes[room.gamemode as keyof typeof gamemodes]?.name ??
              room.gamemode}
          </h1>
        </Link>
        <div className="flex flex-row items-center gap-3">
          <button
            onClick={shareRoom}
            className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
            aria-label="Raum teilen"
          >
            <Share2 size={12} />
            {code}
          </button>
          <Scoring
            players={scoringPlayers as Parameters<typeof Scoring>[0]["players"]}
            gamemode={room.gamemode as keyof typeof gamemodes}
          >
            <Button
              variant="outline"
              className={
                gameFinished
                  ? "dark:bg-yellow-400 bg-yellow-400 hover:bg-yellow-500 dark:text-black"
                  : ""
              }
            >
              <Trophy />
              <span className="hidden sm:block">Punkteauswertung</span>
            </Button>
          </Scoring>
        </div>
      </Card>

      {/* Chaoswunder mission */}
      {room.gamemode === "Chaoswunder" && missions.length > 0 && (
        <Card className="p-4 mb-4 mx-4 flex flex-col justify-between items-center space-y-[-15px] relative overflow-clip">
          <h2 className="text-lg font-bold">
            Mission {currentMissionIndex + 1}
          </h2>
          <div className="flex flex-col items-center w-full px-2">
            <div className="flex items-start gap-2 rounded-lg px-3 text-sm w-full">
              <Dices className="size-4 shrink-0 mt-0.5" />
              <span>{missions[currentMissionIndex].diceRule}</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm w-full">
              <Construction className="size-4 shrink-0 mt-0.5" />
              <span>{missions[currentMissionIndex].restriction}</span>
            </div>
          </div>
          <div className="flex flex-row gap-1.5 pt-1 flex-wrap justify-center">
            {missions.map((_, i) => {
              const missionRoundsPlayed = chaosRoundsPlayed - i * 2;
              const isFull = missionRoundsPlayed >= 1;
              return (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isFull ? "bg-foreground" : "bg-muted-foreground/30"
                  }`}
                />
              );
            })}
          </div>
        </Card>
      )}

      <div
        className="px-4 pb-24 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: "none" }}
        id="player-container"
      >
        <div
          className={`flex flex-row gap-4 ${players.length > 2 ? "min-w-max" : ""}`}
        >
          {players.map((player, index) => {
            const isMe = player.player_key === myPlayerKey;
            const isPlayerHost = player.player_key === room.host_player_key;
            const badge = isPlayerHost ? "Host" : isMe ? "Du" : undefined;
            return (
              <div
                key={player.player_key}
                className="snap-center"
                ref={(el) => {
                  playerRefs.current[index] = el;
                }}
                style={{ width: "calc(50% - 8px)" }}
              >
                <PlayerCard
                  playerName={player.name}
                  playerPoints={player.points}
                  updatePoints={(points) => updateMyPoints(points)}
                  resetPoints={() => {}}
                  removePlayer={() => {}}
                  changeName={() => {}}
                  moveToRight={() => {}}
                  moveToLeft={() => {}}
                  gamemode={room.gamemode as keyof typeof gamemodes}
                  theme={theme}
                  isThemeActive={isThemeActive}
                  readOnly={!isMe}
                  badge={badge}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
