"use client";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mission } from "../gamemodes/chaoswunder";

type ChaosMissionsProps = {
  missions: Mission[];
  currentIndex: number;
  /** Rounds already played, for the progress dots. */
  roundsPlayed: number;
  /** 1 = a new mission every round, 2 = every second round. */
  interval: number;
  missionEveryRound: boolean;
  onToggleMissionEveryRound: () => void;
  balancedMode: boolean;
  onToggleBalancedMode: () => void;
};

/** The Chaoswunder banner: active mission, its settings and the progress dots. */
export function ChaosMissions({
  missions,
  currentIndex,
  roundsPlayed,
  interval,
  missionEveryRound,
  onToggleMissionEveryRound,
  balancedMode,
  onToggleBalancedMode,
}: ChaosMissionsProps) {
  if (missions.length === 0) return null;
  const mission = missions[currentIndex];

  return (
    <Card className="relative mx-4 mb-4 flex h-full flex-col items-center justify-between space-y-[-15px] overflow-clip p-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings size={16} />
          </Button>
        </DialogTrigger>
        <DialogContent className="top-50 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Einstellungen</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 pt-2">
            <SettingSwitch
              title="Mission jede Runde wechseln"
              hint="Aus: alle 2 Runden · Ein: jede Runde"
              checked={missionEveryRound}
              onToggle={onToggleMissionEveryRound}
            />
            <SettingSwitch
              title="Ausgewogener Modus"
              hint={
                interval === 2
                  ? "1 schwere · 3 neutrale · 3 gute Missionen"
                  : "2 schwere · 6 neutrale · 6 gute Missionen"
              }
              checked={balancedMode}
              onToggle={onToggleBalancedMode}
            />
          </div>
        </DialogContent>
      </Dialog>

      <h2 className="text-lg font-bold">Mission {currentIndex + 1}</h2>
      <div className="flex w-full flex-col items-center px-2">
        <div className="flex w-full items-start gap-2 rounded-lg px-3 text-sm">
          🎲
          <span>{mission.diceRule}</span>
        </div>
        <div className="flex w-full items-start gap-2 rounded-lg px-3 py-1.5 text-sm">
          🚧
          <span>{mission.restriction}</span>
        </div>
      </div>

      <div className="flex flex-row flex-wrap justify-center gap-1.5 pt-1">
        {missions.map((_, index) => (
          <ProgressDot
            key={index}
            roundsIntoMission={roundsPlayed - index * interval}
            isCurrent={index === currentIndex}
            interval={interval}
          />
        ))}
      </div>
    </Card>
  );
}

function ProgressDot({
  roundsIntoMission,
  isCurrent,
  interval,
}: {
  roundsIntoMission: number;
  isCurrent: boolean;
  interval: number;
}) {
  const isFull =
    interval === 2
      ? roundsIntoMission >= 1
      : roundsIntoMission >= interval || isCurrent;
  const isHalf = interval === 2 ? roundsIntoMission === 0 : false;

  if (isFull) {
    return <span className="h-1.5 w-1.5 rounded-full bg-foreground" />;
  }
  if (isHalf) {
    return (
      <span className="flex h-1.5 w-1.5 overflow-hidden rounded-full">
        <span className="h-full w-1/2 bg-foreground" />
        <span className="h-full w-1/2 bg-muted-foreground/30" />
      </span>
    );
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />;
}

function SettingSwitch({
  title,
  hint,
  checked,
  onToggle,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
