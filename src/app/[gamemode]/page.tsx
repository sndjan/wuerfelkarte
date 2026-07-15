"use client";

import AddPlayer from "@/components/AddPlayer";
import GamemodeInfo from "@/components/GamemodeInfo";
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Points } from "@/components/hooks/types";
import { useKniffel } from "@/components/hooks/useKniffel";
import { Menu } from "@/components/Menu";
import { PageHeader } from "@/components/PageHeader";
import PlayerCard from "@/components/PlayerCard";
import ResetGame from "@/components/ResetGame";
import { Scoring } from "@/components/Scoring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Construction,
  Dices,
  RotateCcw,
  Settings,
  Trophy,
  UserRoundPlus,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/hooks/useTheme";
import {
  Mission,
  missions as chaosMissions,
} from "@/components/gamemodes/chaoswunder";
import { toast } from "sonner";

export type Theme = "none" | "Halloween" | "Christmas" | "Easter";

function loadChaosSetting(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const saved = localStorage.getItem("chaoswunderSettings");
    return saved ? (JSON.parse(saved)[key] ?? defaultValue) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveChaosSetting(key: string, value: boolean) {
  try {
    const saved = localStorage.getItem("chaoswunderSettings");
    const current = saved ? JSON.parse(saved) : {};
    localStorage.setItem(
      "chaoswunderSettings",
      JSON.stringify({ ...current, [key]: value }),
    );
  } catch {
    // ignore
  }
}

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
  const [missionEveryRound, setMissionEveryRound] = useState(() =>
    loadChaosSetting("missionEveryRound", false),
  );
  const [balancedMode, setBalancedMode] = useState(() =>
    loadChaosSetting("balancedMode", false),
  );

  const chaosRoundInterval = missionEveryRound ? 1 : 2;

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
    if (gamemode !== "Chaoswunder") {
      setCurrentMissionIndex(0);
      setMissions([]);
      return;
    }

    setCurrentMissionIndex(0);
    prevMissionIndexRef.current = -1;

    const missionCount = 14 / chaosRoundInterval;
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

    if (balancedMode) {
      const hard = shuffle(chaosMissions.filter((m) => m.difficulty === 3));
      const neutral = shuffle(chaosMissions.filter((m) => m.difficulty === 2));
      const good = shuffle(chaosMissions.filter((m) => m.difficulty === 1));

      const hardCount = missionCount === 7 ? 1 : 2;
      const neutralCount = missionCount === 7 ? 3 : 6;
      const goodCount = missionCount === 7 ? 3 : 6;

      setMissions(
        shuffle([
          ...hard.slice(0, hardCount),
          ...neutral.slice(0, neutralCount),
          ...good.slice(0, goodCount),
        ]),
      );
    } else {
      setMissions(shuffle(chaosMissions).slice(0, missionCount));
    }
  }, [gamemode, missionEveryRound, balancedMode, chaosRoundInterval]);

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
      Math.floor(roundsPlayed / chaosRoundInterval),
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
  }, [gamemode, missions.length, players, chaosRoundInterval]);

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

  const chaosRoundsPlayed = useMemo(() => {
    if (gamemode !== "Chaoswunder" || players.length === 0) return 0;
    return Math.min(
      ...players.map(
        (player) =>
          Object.values(player.points).filter((point) => point !== 0).length,
      ),
    );
  }, [gamemode, players]);

  const roundsUntilMissionChange = useMemo(() => {
    if (gamemode !== "Chaoswunder" || players.length === 0) return null;
    const remainder = chaosRoundsPlayed % chaosRoundInterval;
    return remainder === 0
      ? chaosRoundInterval
      : chaosRoundInterval - remainder;
  }, [gamemode, players.length, chaosRoundsPlayed, chaosRoundInterval]);

  const gameFinished = useMemo(() => {
    const fields = gamemodes[gamemode]?.fields.map((f) => f.key) ?? [];
    return (
      players.length > 0 &&
      players.every((player) =>
        fields.every((key) => {
          const point = player.points[key as keyof typeof player.points];
          return point !== undefined && point !== 0;
        }),
      )
    );
  }, [players, gamemode]);

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
      <PageHeader
        backHref="/"
        title={gamemodes[gamemode].name}
        right={
          <>
            <Scoring players={players} gamemode={gamemode}>
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
            <div className="hidden sm:block">
              <AddPlayer addPlayer={addPlayer}>
                <Button variant="outline">
                  <UserRoundPlus />
                </Button>
              </AddPlayer>
            </div>
            <div className="hidden sm:block">
              <ResetGame resetAllPoints={resetAllPoints}>
                <Button variant="outline">
                  <RotateCcw />
                </Button>
              </ResetGame>
            </div>
            {gamemodes[gamemode].information && (
              <div className="hidden sm:block">
                <GamemodeInfo gamemodeInfo={gamemodes[gamemode].information} />
              </div>
            )}
            <Menu
              resetAll={resetAll}
              resetAllPoints={resetAllPoints}
              addPlayer={addPlayer}
              specialTheme={theme}
              isThemeActive={isThemeActive}
              setIsThemeActive={setIsThemeActive}
              gamemodeInfo={gamemodes[gamemode].information}
            />
          </>
        }
      />
      <div>
        {gamemode === "Chaoswunder" && missions.length > 0 && (
          <Card className="p-4 mb-4 mx-4 flex flex-col justify-between items-center space-y-[-15px] h-full relative overflow-clip">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings size={16} />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] top-50">
                <DialogHeader>
                  <DialogTitle>Einstellungen</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-5 pt-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        Mission jede Runde wechseln
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Aus: alle 2 Runden · Ein: jede Runde
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={missionEveryRound}
                      onClick={() => {
                        const next = !missionEveryRound;
                        setMissionEveryRound(next);
                        saveChaosSetting("missionEveryRound", next);
                      }}
                      className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        missionEveryRound ? "bg-primary" : "bg-input"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                          missionEveryRound ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Ausgewogener Modus</p>
                      <p className="text-xs text-muted-foreground">
                        {chaosRoundInterval === 2
                          ? "1 schwere · 3 neutrale · 3 gute Mission"
                          : "2 schwere · 6 neutrale · 6 gute Missionen"}
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={balancedMode}
                      onClick={() => {
                        const next = !balancedMode;
                        setBalancedMode(next);
                        saveChaosSetting("balancedMode", next);
                      }}
                      className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        balancedMode ? "bg-primary" : "bg-input"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                          balancedMode ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <h2 className="text-lg font-bold">
              Mission {currentMissionIndex + 1}
            </h2>
            <div className="flex flex-col items-center  w-full px-2">
              <div className="flex items-start gap-2 rounded-lg  px-3 text-sm w-full">
                <Dices className="size-4 shrink-0 mt-0.5" />
                <span>{missions[currentMissionIndex].diceRule}</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg  px-3 py-1.5 text-sm w-full">
                <Construction className="size-4 shrink-0 mt-0.5" />
                <span>{missions[currentMissionIndex].restriction}</span>
              </div>
            </div>
            {roundsUntilMissionChange !== null && (
              <div className="flex flex-row gap-1.5 pt-1 flex-wrap justify-center">
                {missions.map((_, i) => {
                  const missionRoundsPlayed =
                    chaosRoundsPlayed - i * chaosRoundInterval;
                  const isCurrent = i === currentMissionIndex;
                  const isFull =
                    chaosRoundInterval === 2
                      ? missionRoundsPlayed >= 1
                      : missionRoundsPlayed >= chaosRoundInterval ||
                        (isCurrent && chaosRoundInterval === 1);
                  const isHalf =
                    chaosRoundInterval === 2 ? missionRoundsPlayed === 0 : false;
                  if (isFull) {
                    return (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-foreground transition-colors"
                      />
                    );
                  } else if (isHalf) {
                    return (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full overflow-hidden flex"
                      >
                        <div className="w-1/2 h-full bg-foreground" />
                        <div className="w-1/2 h-full bg-muted-foreground/30" />
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 transition-colors"
                      />
                    );
                  }
                })}
              </div>
            )}
          </Card>
        )}
      </div>
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
