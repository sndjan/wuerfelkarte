"use client";

import { Theme } from "@/app/yatzy/[gamemode]/page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EllipsisVertical,
  Info,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  Trash2,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { AddPlayer } from "./AddPlayer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PROFILE_ACTIVE = process.env.NEXT_PUBLIC_PROFILE_ACTIVE === "true";

interface MenuProps {
  resetAll?: () => void;
  resetAllPoints?: () => void;
  addPlayer?: (name: string) => void;
  specialTheme?: Theme;
  isThemeActive?: boolean;
  setIsThemeActive?: (active: boolean) => void;
  gamemodeInfo?: string[];
}

export function Menu({
  resetAll,
  resetAllPoints,
  addPlayer,
  specialTheme,
  isThemeActive,
  setIsThemeActive,
  gamemodeInfo,
}: MenuProps) {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Optionen</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {addPlayer && (
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <AddPlayer addPlayer={addPlayer}>
                  <div className="flex items-center gap-2 w-full">
                    <UserRoundPlus />
                    <span>Spieler hinzufügen</span>
                  </div>
                </AddPlayer>
              </DropdownMenuItem>
            )}
            
            {gamemodeInfo && gamemodeInfo.length > 0 && (
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="flex items-center gap-2 w-full">
                      <Info />
                      <span>Regeln anzeigen</span>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Infos zum Spielmodus</DialogTitle>
                    </DialogHeader>
                    {gamemodeInfo.length > 0 && (
                      <DialogDescription>{gamemodeInfo[0]}</DialogDescription>
                    )}
                    <div className="grid grid-cols-1 gap-4">
                      {gamemodeInfo.slice(1).map((info, index) => (
                        <p key={index} className="text-sm">
                          {info}
                        </p>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </DropdownMenuItem>
            )}
            {resetAllPoints && (
              <DropdownMenuItem onSelect={resetAllPoints}>
                <RotateCcw />
                <span>Werte zurücksetzen</span>
              </DropdownMenuItem>
            )}
            {resetAll && (
              <DropdownMenuItem onSelect={resetAll}>
                <Trash2 />
                <span>Alles zurücksetzen</span>
              </DropdownMenuItem>
            )}
            {PROFILE_ACTIVE && (
              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 w-full"
                >
                  <UserRound />
                  <span>Profil</span>
                </Link>
              </DropdownMenuItem>
            )}
            {specialTheme !== "none" && specialTheme !== undefined && (
              <DropdownMenuItem
                onSelect={() => {
                  if (setIsThemeActive) {
                    setIsThemeActive(!isThemeActive);
                  }
                }}
              >
                <Palette />
                {isThemeActive ? (
                  <span>Design deaktivieren</span>
                ) : (
                  <span>Design aktivieren</span>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-[1.2rem] w-[1.2rem] transition-all scale-100" />
                  <span>Dunkler Modus</span>
                </>
              ) : (
                <>
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
                  <span>Heller Modus</span>
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
