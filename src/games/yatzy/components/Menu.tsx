"use client";

import { UserRoundPlus } from "lucide-react";

import { GameMenu } from "@/games/shared/components/GameMenu";
import type { Theme } from "@/components/common/seasonal/useSeasonalTheme";

interface MenuProps {
  gamemodeInfo?: string[];
  /** Opens the player dialog owned by the board, so both entry points share it. */
  onAddPlayer: () => void;
  onResetPoints: () => void;
  onResetAll: () => void;
  seasonalTheme: Theme;
  isThemeActive?: boolean;
  onToggleTheme: () => void;
  compactMode: boolean;
  onToggleCompactMode: () => void;
}

export function Menu({
  gamemodeInfo,
  onAddPlayer,
  onResetPoints,
  onResetAll,
  seasonalTheme,
  isThemeActive,
  onToggleTheme,
  compactMode,
  onToggleCompactMode,
}: MenuProps) {
  return (
    <GameMenu
      actions={[
        {
          icon: <UserRoundPlus />,
          label: "Spieler hinzufügen",
          onSelect: onAddPlayer,
        },
      ]}
      gamemodeInfo={gamemodeInfo}
      compactMode={{ value: compactMode, onToggle: onToggleCompactMode }}
      resetRounds={{ label: "Werte zurücksetzen", onSelect: onResetPoints }}
      onResetAll={onResetAll}
      seasonalTheme={
        seasonalTheme === "none"
          ? undefined
          : { active: isThemeActive ?? false, onToggle: onToggleTheme }
      }
    />
  );
}
