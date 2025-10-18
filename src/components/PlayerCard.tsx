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
}) => {
  const config = gamemodes[gamemode];
  const [jsConfetti, setJsConfetti] = useState<JSConfetti | null>(null);

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
      jsConfetti?.addConfetti({ emojis: ["⭐", "🎲"] });
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
    <Card className="p-4 flex flex-col justify-between items-center space-y-[-15px] h-full">
      <div className="flex flex-row justify-between w-full items-center mb-1">
        <div>{playerName}</div>
        <EditPlayer
          playerName={playerName}
          resetPoints={resetPoints}
          removePlayer={removePlayer}
          changeName={changeName}
          moveToRight={moveToRight}
          moveToLeft={moveToLeft}
        />
      </div>
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
            <Select
              key={key}
              value={
                playerPoints[key] !== 0 && playerPoints[key] !== undefined
                  ? playerPoints[key].toString()
                  : ""
              }
              onValueChange={(value) => onValueChange(value, key)}
            >
              <SelectTrigger
                className={`w-full h-2 ${
                  playerPoints[key] === "X"
                    ? "bg-red-100"
                    : playerPoints[key] === 0 || playerPoints[key] === undefined
                    ? "bg-white"
                    : "bg-gray-100"
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
                    )
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
              (acc, bonusKey) =>
                acc +
                (typeof playerPoints[bonusKey] === "number"
                  ? (playerPoints[bonusKey] as number)
                  : 0),
              0
            );
            const bonusReached = sum >= config.bonus.minSum;
            return (
              <div
                key={key + "-with-bonus"}
                className="w-full flex flex-col items-center"
              >
                {fieldElement}
                <div className="my-3 font-bold">
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
        }
      )}
    </Card>
  );
};

export default PlayerCard;
