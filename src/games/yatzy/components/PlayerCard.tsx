"use client";

import { Card } from "@/components/ui/card";
import JSConfetti from "js-confetti";
import { useEffect, useState } from "react";
import { pointOptions } from "../points";
import { EditPlayer } from "./EditPlayer";
import { BattleFieldStatus } from "../gamemodes/battle";
import { gamemodes } from "../gamemodes";
import {
  THEME_EMOJIS,
  type Theme,
} from "@/components/common/seasonal/useSeasonalTheme";
import ThemeManager from "@/components/common/seasonal/ThemeManager";
import { Badge } from "@/components/ui/badge";
import { GridSelect } from "@/components/ui/grid-select";
import { Progress } from "@/components/ui/progress";

interface PlayerCardProps {
  playerName: string;
  playerEmoji?: string;
  playerPoints: Record<string, number | "X">;
  updatePoints: (points: Record<string, number | "X">) => void;
  resetPoints: () => void;
  removePlayer: () => void;
  changeName: (name: string, emoji?: string) => void;
  takenNames?: string[];
  moveToRight: () => void;
  moveToLeft: () => void;
  gamemode: keyof typeof gamemodes;
  theme?: Theme;
  isThemeActive?: boolean;
  readOnly?: boolean;
  hideMenu?: boolean;
  badge?: string;
  battleFieldStatus?: Record<string, BattleFieldStatus>;
  doubledFields?: Set<string>;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  playerName,
  playerEmoji,
  playerPoints,
  updatePoints,
  resetPoints,
  removePlayer,
  changeName,
  takenNames,
  moveToRight,
  moveToLeft,
  gamemode,
  theme = "none",
  isThemeActive = false,
  readOnly = false,
  hideMenu = false,
  badge,
  battleFieldStatus,
  doubledFields,
}) => {
  const config = gamemodes[gamemode];
  const [jsConfetti, setJsConfetti] = useState<JSConfetti | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);

  const confettiEmojis = playerEmoji
    ? [...THEME_EMOJIS[theme], playerEmoji]
    : THEME_EMOJIS[theme];

  useEffect(() => {
    if (typeof window !== "undefined") {
      setJsConfetti(new JSConfetti());
    }
  }, []);

  const onValueChange = (value: string, key: string) => {
    // Trigger confetti for special achievements
    if (
      (key.includes("Wunder") && ["30", "50", "100"].includes(value)) ||
      (key === "Große Straße" && value === "40" && playerName === "Mama")
    ) {
      jsConfetti?.addConfetti({ emojis: confettiEmojis });
    }

    if (value === "reset") {
      updatePoints({ [key]: 0 });
    } else if (value === "X") {
      updatePoints({ [key]: "X" });
    } else {
      updatePoints({ [key]: parseInt(value, 10) });
    }
  };

  return (
    <Card className="p-4 flex flex-col justify-between items-center space-y-[-15px] h-full relative overflow-clip">
      <div className="flex flex-row justify-between w-full items-center mb-1">
        <button
          className="z-20 font-bold bg-white dark:bg-[#171717] px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#212121] transition-colors cursor-pointer"
          onClick={() => !badge && setNameDialogOpen(true)}
          style={badge ? { cursor: "default" } : undefined}
        >
          {playerEmoji ? `${playerEmoji} ` : ""}
          {playerName}
        </button>
        {badge ? (
          <Badge variant="secondary" className="text-xs z-20">
            {badge}
          </Badge>
        ) : !readOnly && !hideMenu ? (
          <EditPlayer
            playerName={playerName}
            playerEmoji={playerEmoji}
            takenNames={takenNames}
            resetPoints={resetPoints}
            removePlayer={removePlayer}
            changeName={changeName}
            moveToRight={moveToRight}
            moveToLeft={moveToLeft}
            nameDialogOpen={nameDialogOpen}
            onNameDialogOpenChange={setNameDialogOpen}
          />
        ) : null}
      </div>

      <ThemeManager
        theme={theme}
        isThemeActive={isThemeActive}
        // The narrow MiniWunder card has no room for the centre-piece.
        compact={gamemode === "MiniWunder"}
      />

      {config.fields.map(
        (field: {
          key: string;
          label: string;
          options?: Array<number | string>;
        }) => {
          const { key, label, options } = field;
          const selectOptions =
            options ?? pointOptions[key as keyof typeof pointOptions];
          const own = playerPoints[key];
          const isOpen = own === 0 || own === undefined;
          const status = battleFieldStatus?.[key] ?? "open";
          const isDoubled = doubledFields?.has(key) ?? false;
          const cellClass =
            own === "X"
              ? "bg-red-100 hover:bg-red-200 dark:bg-[#950606] dark:hover:bg-[#a40b0b]"
              : !isOpen
                ? "bg-gray-100 hover:bg-gray-200 dark:bg-[#2f2f2f] dark:hover:bg-[#3b3b3b]"
                : status === "blocked"
                  ? "bg-gray-200 text-muted-foreground opacity-60 ring-1 ring-inset ring-gray-300 dark:bg-[#1a1a1a] dark:ring-[#333]"
                  : status === "forced"
                    ? "bg-amber-100 hover:bg-amber-200 ring-2 ring-amber-400 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 dark:ring-amber-500"
                    : "bg-white hover:bg-gray-50 dark:bg-[#212121] dark:hover:bg-[#2a2a2a]";
          const fieldElement = (
            <div
              key={key}
              className="w-full flex flex-col items-center z-10 relative"
            >
              <GridSelect
                key={key}
                value={
                  playerPoints[key] !== 0 && playerPoints[key] !== undefined
                    ? playerPoints[key].toString()
                    : ""
                }
                onValueChange={(value) => onValueChange(value, key)}
                options={selectOptions ?? []}
                label={label}
                disabled={readOnly}
                className={`w-full h-2 transition-colors pr-2 ${cellClass}`}
              />
              {isDoubled && (
                <Badge className="absolute right-8 top-1/2 -translate-y-1/2 z-20 bg-green-700 font-bold pointer-events-none">
                  ×2
                </Badge>
              )}
              {isOpen && !isDoubled && status === "forced" && (
                <span className="absolute right-8 top-1/2 -translate-y-1/2 z-20 text-xs font-bold text-amber-600 dark:text-amber-400 pointer-events-none">
                  Pflicht
                </span>
              )}
              {isOpen && status === "blocked" && (
                <span className="absolute right-8 top-1/2 -translate-y-1/2 z-20 text-xs pointer-events-none">
                  🔒
                </span>
              )}
            </div>
          );
          // Show bonus after the last bonus field
          const isBonusField =
            config.bonus && config.bonus.fields.includes(key);
          const isLastBonusField =
            isBonusField &&
            config.bonus?.fields[config.bonus.fields.length - 1] === key;
          if (isLastBonusField && config.bonus) {
            // Calculate sum of bonus fields
            const sum = config.bonus.fields.reduce(
              (acc: number, bonusKey: string | number) => {
                const v =
                  typeof playerPoints[bonusKey] === "number"
                    ? (playerPoints[bonusKey] as number)
                    : 0;
                return acc + (doubledFields?.has(String(bonusKey)) ? v * 2 : v);
              },
              0,
            );
            const bonusReached = sum >= config.bonus.minSum;
            const progress = (sum / config.bonus.minSum) * 100;
            return (
              <div
                key={key + "-with-bonus"}
                className="w-full flex flex-col items-center"
              >
                {fieldElement}
                <div className="my-3 w-full z-20 bg-white dark:bg-[#171717] px-3 py-2 rounded-md">
                  <div className="flex items-center justify-center gap-2 font-bold">
                    <span>{sum}</span>
                    {bonusReached && (
                      <Badge className="bg-green-800 font-bold">
                        +{config.bonus.bonus}
                      </Badge>
                    )}
                  </div>
                  <Progress
                    value={progress}
                    className="mt-2"
                    indicatorClassName={
                      bonusReached
                        ? "bg-green-800 dark:bg-green-700"
                        : "bg-green-700 dark:bg-green-400"
                    }
                  />
                  <div className="mt-1 text-xs text-muted-foreground">
                    {sum} / {config.bonus.minSum} für Bonus
                  </div>
                </div>
              </div>
            );
          }
          return fieldElement;
        },
      )}
    </Card>
  );
};

export default PlayerCard;
