"use client";

import { Card } from "@/components/ui/card";
import JSConfetti from "js-confetti";
import { useEffect, useState } from "react";
import pointsJson from "../../public/points.json";
import { EditPlayer } from "./EditPlayer";
import { gamemodes } from "./gamemodes/gamemodes";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Theme } from "@/app/[gamemode]/page";
import ThemeManager from "./themes/ThemeManager";
import { THEME_EMOJIS } from "./hooks/useTheme";

interface PlayerCardProps {
  playerName: string;
  playerPoints: Record<string, number | "X">;
  updatePoints: (points: Record<string, number | "X">) => void;
  resetPoints: () => void;
  removePlayer: () => void;
  changeName: (name: string) => void;
  moveToRight: () => void;
  moveToLeft: () => void;
  gamemode: keyof typeof gamemodes;
  theme?: Theme;
  isThemeActive?: boolean;
  readOnly?: boolean;
  badge?: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  playerName,
  playerPoints,
  updatePoints,
  resetPoints,
  removePlayer,
  changeName,
  moveToRight,
  moveToLeft,
  gamemode,
  theme = "none",
  isThemeActive = false,
  readOnly = false,
  badge,
}) => {
  const config = gamemodes[gamemode];
  const [jsConfetti, setJsConfetti] = useState<JSConfetti | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);

  const confettiEmojis = THEME_EMOJIS[theme];

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
          {playerName}
        </button>
        {badge ? (
          <Badge variant="secondary" className="text-xs z-20">{badge}</Badge>
        ) : !readOnly ? (
          <EditPlayer
            playerName={playerName}
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
        gamemode={gamemode}
        theme={theme}
        isThemeActive={isThemeActive}
      />

      {config.fields.map(
        (field: {
          key: string;
          label: string;
          options?: Array<number | string>;
        }) => {
          const { key, label, options } = field;
          const selectOptions =
            options ?? pointsJson[key as keyof typeof pointsJson];
          const fieldElement = (
            <div key={key} className="w-full flex flex-col items-center z-10 ">
              <Select
                key={key}
                value={
                  playerPoints[key] !== 0 && playerPoints[key] !== undefined
                    ? playerPoints[key].toString()
                    : ""
                }
                onValueChange={(value) => onValueChange(value, key)}
                disabled={readOnly}
              >
                <SelectTrigger
                  className={`w-full h-2 transition-colors ${
                    playerPoints[key] === "X"
                      ? "bg-red-100 hover:bg-red-200 dark:bg-[#950606] dark:hover:bg-[#a40b0b]"
                      : playerPoints[key] === 0 ||
                          playerPoints[key] === undefined
                        ? "bg-white hover:bg-gray-50 dark:bg-[#212121] dark:hover:bg-[#2a2a2a]"
                        : "bg-gray-100 hover:bg-gray-200 dark:bg-[#2f2f2f] dark:hover:bg-[#3b3b3b]"
                  }`}
                >
                  <SelectValue placeholder={label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {selectOptions?.map?.(
                      (value: number | string, idx: number) => (
                        <SelectItem key={idx} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectItem value="reset" className="font-bold">
                      Zurücksetzen
                    </SelectItem>
                    <SelectItem value="X" className="font-bold">
                      ❌
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
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
              (acc: number, bonusKey: string | number) =>
                acc +
                (typeof playerPoints[bonusKey] === "number"
                  ? (playerPoints[bonusKey] as number)
                  : 0),
              0,
            );
            const bonusReached = sum >= config.bonus.minSum;
            return (
              <div
                key={key + "-with-bonus"}
                className="w-full flex flex-col items-center"
              >
                {fieldElement}
                <div className="my-3 font-bold z-20 bg-white dark:bg-[#171717] px-3 py-1.5 rounded-md">
                  {config.bonus.label}
                  {bonusReached ? (
                    <>
                      {sum}{" "}
                      <Badge className="ml-2 bg-green-600 font-bold">
                        +{config.bonus.bonus}
                      </Badge>
                    </>
                  ) : (
                    <>{sum} </>
                  )}
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
