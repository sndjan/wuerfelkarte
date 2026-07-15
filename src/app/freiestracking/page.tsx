"use client";

import AddPlayer from "@/components/AddPlayer";
import FreeTrackingCard from "@/components/FreeTrackingCard";
import { FreeTrackingScoring } from "@/components/FreeTrackingScoring";
import { useFreeTracking } from "@/components/hooks/useFreeTracking";
import { Menu } from "@/components/Menu";
import { PageHeader } from "@/components/PageHeader";
import ResetGame from "@/components/ResetGame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RotateCcw, Settings, Trophy, UserRoundPlus } from "lucide-react";
import { useRef } from "react";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function FreeTrackingPage() {
  const {
    players,
    settings,
    initialized,
    addPlayer,
    removePlayer,
    changeName,
    moveToRight,
    moveToLeft,
    updateRound,
    resetRounds,
    resetAllRounds,
    resetAll,
    updateSettings,
  } = useFreeTracking();

  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const currentRoundIndex =
    players.length > 0 ? players[0].rounds.length - 1 : 0;

  const handleCurrentRoundFilled = (playerId: number) => {
    const currentIndex = players.findIndex((p) => p.id === playerId);
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
        container.scrollTo({ left: scrollPosition, behavior: "smooth" });
      }
    }, 100);
  };

  if (!initialized) return null;

  const lowestWins = settings.winCondition === "lowest";

  return (
    <>
      <PageHeader
        backHref="/"
        title="Freies Tracking"
        right={
          <>
            <FreeTrackingScoring players={players} settings={settings}>
              <Button variant="outline">
                <Trophy />
                <span className="hidden sm:block">Punkteauswertung</span>
              </Button>
            </FreeTrackingScoring>
            <div className="hidden sm:block">
              <AddPlayer addPlayer={addPlayer}>
                <Button variant="outline">
                  <UserRoundPlus />
                </Button>
              </AddPlayer>
            </div>
            <div className="hidden sm:block">
              <ResetGame resetAllPoints={resetAllRounds}>
                <Button variant="outline">
                  <RotateCcw />
                </Button>
              </ResetGame>
            </div>
            <Menu
              resetAll={resetAll}
              resetAllPoints={resetAllRounds}
              addPlayer={addPlayer}
            />
          </>
        }
      />

      {/* Settings Card */}
      <Card className="p-3 mb-4 mx-4 flex flex-row items-center justify-between gap-2">
        <div className="flex flex-row gap-2 flex-wrap">
          <Badge variant="secondary">
            {lowestWins ? "Niedrigster gewinnt" : "Höchster gewinnt"}
          </Badge>
          {settings.roundLimit !== null && (
            <Badge variant="secondary">
              Limit: {settings.roundLimit} Runden
            </Badge>
          )}
          {settings.targetScore !== null && (
            <Badge variant="secondary">Ziel: {settings.targetScore} Pkte</Badge>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Settings size={16} />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] top-50">
            <DialogHeader>
              <DialogTitle>Einstellungen</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-5 pt-2">
              {/* Win condition */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Niedrigster gewinnt</p>
                  <p className="text-xs text-muted-foreground">
                    Aus: höchster Punktestand gewinnt · Ein: niedrigster gewinnt
                  </p>
                </div>
                <Toggle
                  checked={lowestWins}
                  onChange={(v) =>
                    updateSettings({ winCondition: v ? "lowest" : "highest" })
                  }
                />
              </div>

              {/* Round limit */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Rundenlimit</p>
                  <p className="text-xs text-muted-foreground">
                    Maximale Anzahl an Runden (leer = kein Limit)
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  className="w-20 text-center"
                  value={settings.roundLimit ?? ""}
                  placeholder="∞"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      updateSettings({ roundLimit: null });
                    } else {
                      const parsed = parseInt(raw, 10);
                      if (!isNaN(parsed) && parsed > 0)
                        updateSettings({ roundLimit: parsed });
                    }
                  }}
                />
              </div>

              {/* Target score */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Zielpunktzahl</p>
                  <p className="text-xs text-muted-foreground">
                    leer = kein Ziel
                  </p>
                </div>
                <Input
                  type="number"
                  className="w-20 text-center"
                  value={settings.targetScore ?? ""}
                  placeholder="—"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      updateSettings({ targetScore: null });
                    } else {
                      const parsed = parseInt(raw, 10);
                      if (!isNaN(parsed))
                        updateSettings({ targetScore: parsed });
                    }
                  }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>

      {/* Player Cards */}
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
          {players.map((player, index) => (
            <div
              className="snap-center"
              key={player.id}
              ref={(el) => {
                playerRefs.current[index] = el;
              }}
              style={{ width: "calc(50% - 8px)" }}
            >
              <FreeTrackingCard
                player={player}
                currentRoundIndex={currentRoundIndex}
                settings={settings}
                onUpdateRound={(roundIndex, value) =>
                  updateRound(player.id, roundIndex, value)
                }
                onCurrentRoundFilled={() => handleCurrentRoundFilled(player.id)}
                onResetRounds={() => resetRounds(player.id)}
                onRemovePlayer={() => removePlayer(player.id)}
                onChangeName={(name) => changeName(player.id, name)}
                onMoveLeft={() => moveToLeft(player.id)}
                onMoveRight={() => moveToRight(player.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
