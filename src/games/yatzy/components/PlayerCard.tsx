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
import { Button } from "@/components/ui/button";
import { GridSelect } from "@/components/ui/grid-select";
import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

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
  /** Denser paddings/gaps so a full sheet fits on screen without scrolling. */
  compact?: boolean;
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
  compact = false,
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
    <Card
      className={`flex flex-col justify-between items-center h-full relative overflow-clip ${
        compact ? "p-3 space-y-[-4px]" : "p-4 space-y-[-15px]"
      }`}
    >
      <div
        // In compact mode this stacks with the card's own space-y-[-4px] gap
        // (flex items don't collapse margins), pulling the first field a bit
        // closer than the roomier gap used between the rest of the fields.
        className={`flex flex-row justify-between w-full items-center ${compact ? "mb-[-4px]" : "mb-1"}`}
      >
        <button
          className={`z-20 min-w-0 flex-1 font-bold bg-white dark:bg-card rounded-md hover:bg-gray-100 dark:hover:bg-secondary transition-colors cursor-pointer text-left ${
            compact ? "px-2.5 py-1 text-sm" : "px-3 py-1.5"
          }`}
          onClick={() => !badge && setNameDialogOpen(true)}
          style={badge ? { cursor: "default" } : undefined}
          title={playerName}
        >
          <span className="block truncate">
            {playerEmoji ? `${playerEmoji} ` : ""}
            {playerName}
          </span>
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
          const quickFillValue = config.quickFill?.[key];
          const showQuickFill =
            quickFillValue !== undefined && isOpen && !readOnly;
          const fieldElement = (
            <div key={key} className="w-full flex items-center gap-2">
              <div className="min-w-0 flex-1 flex flex-col items-center z-10 relative">
                <GridSelect
                  value={
                    playerPoints[key] !== 0 && playerPoints[key] !== undefined
                      ? playerPoints[key].toString()
                      : ""
                  }
                  onValueChange={(value) => onValueChange(value, key)}
                  options={selectOptions ?? []}
                  label={label}
                  disabled={readOnly}
                  className={`w-full h-2 transition-colors pr-2 ${
                    compact ? "px-3 py-2 text-sm" : ""
                  } ${cellClass}`}
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
              {showQuickFill && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="z-20 shrink-0 rounded-full size-[34px]"
                  title={`Wahrscheinlichsten Wert übernehmen (${quickFillValue})`}
                  aria-label={`Wahrscheinlichsten Wert für ${label} übernehmen (${quickFillValue})`}
                  onClick={() => onValueChange(quickFillValue.toString(), key)}
                >
                  <Zap className="size-4" />
                </Button>
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
                <div
                  className={`w-full z-20 bg-white dark:bg-card rounded-md ${
                    compact ? "my-2 px-3 py-1.5" : "my-3 px-3 py-2"
                  }`}
                >
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
                  <div
                    className={`text-xs text-muted-foreground ${compact ? "mt-0.5" : "mt-1"}`}
                  >
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
