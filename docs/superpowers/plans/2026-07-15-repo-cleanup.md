# Repo Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the orphaned multiplayer, Freies Tracking, and Supabase/auth (login/profile) features from the codebase, along with their now-dead dependencies and config, leaving `/`, `/yatzy`, and `/yatzy/[gamemode]` as the only reachable app surface.

**Architecture:** Pure deletion + a handful of small edits to strip conditionals in files that survive (`Menu.tsx`, `page.tsx`, `Scoring.tsx`). No new code, no behavior changes to gameplay. Each task removes one self-contained feature area; a final task removes the now-unused Supabase npm packages and runs whole-repo verification.

**Tech Stack:** Next.js 15 (App Router), TypeScript, no automated test runner in this repo.

## Global Constraints

- Do not touch `src/app/yatzy/**`, `src/components/hooks/useKniffel.ts`, `src/components/hooks/types.ts`, `src/components/PlayerCard.tsx`, `src/components/gamemodes/**`, or anything under `src/components/yatzy-lobby/**`.
- Do not delete hosted Supabase tables/data — only application code that calls them.
- Do not edit `.env.local`.
- This repo has no automated test runner (no jest/vitest/RTL in `package.json`). Per-task verification uses `npx tsc --noEmit -p tsconfig.json` as a compile-correctness gate plus `grep` checks for dangling imports; final behavioral verification is a manual click-through (final task).

---

### Task 1: Remove the multiplayer feature

**Files:**
- Delete: `src/app/multiplayer/page.tsx`
- Delete: `src/app/multiplayer/[code]/page.tsx`
- Delete: `src/app/api/multiplayer/rooms/route.ts`
- Delete: `src/app/api/multiplayer/rooms/[code]/join/route.ts`
- Delete: `src/app/api/multiplayer/rooms/[code]/start/route.ts`
- Delete: `src/app/api/multiplayer/rooms/[code]/score/route.ts`
- Delete: `src/components/hooks/useMultiplayerGame.ts`
- Delete: `src/components/hooks/multiplayer-types.ts`

**Interfaces:** None — this feature is not consumed by any surviving file.

- [ ] **Step 1: Delete the multiplayer pages and API routes**

```bash
rm -rf src/app/multiplayer src/app/api/multiplayer
```

- [ ] **Step 2: Delete the multiplayer hook and types**

```bash
rm src/components/hooks/useMultiplayerGame.ts src/components/hooks/multiplayer-types.ts
```

- [ ] **Step 3: Verify nothing else references the removed files**

Run: `grep -rn "multiplayer" src --include=*.ts --include=*.tsx -il`
Expected: no output (empty)

- [ ] **Step 4: Verify the project still type-checks**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove multiplayer feature"
```

---

### Task 2: Remove the Freies Tracking feature

**Files:**
- Delete: `src/app/freiestracking/page.tsx`
- Delete: `src/components/FreeTrackingCard.tsx`
- Delete: `src/components/FreeTrackingScoring.tsx`
- Delete: `src/components/hooks/useFreeTracking.ts`

**Interfaces:** None — this feature is not consumed by any surviving file.

- [ ] **Step 1: Delete the Freies Tracking page, components, and hook**

```bash
rm -rf src/app/freiestracking
rm src/components/FreeTrackingCard.tsx src/components/FreeTrackingScoring.tsx src/components/hooks/useFreeTracking.ts
```

- [ ] **Step 2: Verify nothing else references the removed files**

Run: `grep -rn "FreeTracking\|freiestracking" src --include=*.ts --include=*.tsx -il`
Expected: no output (empty)

- [ ] **Step 3: Verify the project still type-checks**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Remove Freies Tracking feature"
```

---

### Task 3: Remove Supabase/auth (login, profile) and strip PROFILE_ACTIVE conditionals

**Files:**
- Delete: `src/app/login/page.tsx`, `src/app/login/actions.ts`
- Delete: `src/app/profile/page.tsx`, `src/app/profile/DisplayNameEditor.tsx`
- Delete: `src/app/auth/confirm/route.ts`
- Delete: `src/app/error/page.tsx`
- Delete: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/client-game.ts`, `src/lib/supabase/middleware.ts`
- Delete: `src/middleware.ts`
- Modify: `src/components/Menu.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/Scoring.tsx`

**Interfaces:** None — `Menu`, `page.tsx`, and `Scoring` keep their existing exported signatures; only internals change.

- [ ] **Step 1: Delete the auth pages and Supabase lib**

```bash
rm -rf src/app/login src/app/profile src/app/auth src/app/error
rm -rf src/lib/supabase
rm src/middleware.ts
```

- [ ] **Step 2: Strip the profile menu item from `Menu.tsx`**

Replace the full contents of `src/components/Menu.tsx` with:

```tsx
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
  UserRoundPlus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AddPlayer } from "./AddPlayer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
```

- [ ] **Step 3: Strip the profile button from `src/app/page.tsx`**

Replace the full contents of `src/app/page.tsx` with:

```tsx
"use client";

import { DarkModeToggle } from "@/components/DarkModeToggle";
import { games } from "@/components/games/games";
import { GameTile } from "@/components/games/GameTile";
import { PageHeader } from "@/components/PageHeader";

export default function GamesOverview() {
  return (
    <div className="min-h-full bg-background">
      <PageHeader
        left={
          <span
            className="text-2xl font-extrabold"
            style={{ fontFamily: "var(--font-baloo)" }}
          >
            <span className="text-foreground">tracky</span>
            <span className="text-brand-accent">.fun</span>
          </span>
        }
        right={<DarkModeToggle />}
      />
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {games.map((game) => (
            <GameTile key={game.key} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Strip the "Match speichern" block from `src/components/Scoring.tsx`**

Replace the full contents of `src/components/Scoring.tsx` with:

```tsx
import AnimatedScoreDiagram from "./AnimatedScoreDiagram";
import { gamemodes } from "./gamemodes/gamemodes";
import { Player } from "./hooks/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Share } from "./Share";

interface ScoringProps {
  players: Player[];
  gamemode: keyof typeof gamemodes;
  children: React.ReactNode;
}

export function Scoring({ players, gamemode, children }: ScoringProps) {
  const saveMatchLocally = () => {
    // Check if any player has a non-zero score
    const hasValidScores = players.some((p) => p.score > 0);
    if (!hasValidScores) {
      return;
    }

    const lastMatches = localStorage.getItem("lastMatches");
    const lastMatchesData = lastMatches ? JSON.parse(lastMatches) : [];
    const lastMatchTime = lastMatchesData[lastMatchesData.length - 1]
      ?.timestamp
      ? new Date(
          lastMatchesData[lastMatchesData.length - 1].timestamp
        ).getTime()
      : 0;
    const now = Date.now();
    const timeDiffInSeconds = (now - lastMatchTime) / 1000;

    // Don't save if last match was saved within the last 2 minutes
    if (timeDiffInSeconds < 120) {
      return;
    }

    const newMatch = {
      players,
      gamemode,
      timestamp: new Date().toISOString(),
    };
    lastMatchesData.push(newMatch);

    localStorage.setItem("lastMatches", JSON.stringify(lastMatchesData));
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      saveMatchLocally();
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Punkteauswertung</DialogTitle>
        </DialogHeader>
        <DialogDescription>Siehe wer gewonnen hat</DialogDescription>
        <div className="mt-4">
          <AnimatedScoreDiagram players={players} />
        </div>
        <div className="mt-4 flex gap-2 justify-end items-center">
          <Share gamemode={gamemode} players={players} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Verify no dangling references remain**

Run: `grep -rn "supabase\|PROFILE_ACTIVE" src --include=*.ts --include=*.tsx -il`
Expected: no output (empty)

- [ ] **Step 6: Verify the project still type-checks**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Remove Supabase auth/login/profile and PROFILE_ACTIVE conditionals"
```

---

### Task 4: Remove Supabase dependencies and empty migrations directory

**Files:**
- Modify: `package.json`
- Delete: `supabase/migrations/` (and `supabase/` itself)

**Interfaces:** None.

- [ ] **Step 1: Remove the two Supabase entries from `package.json`**

In the `dependencies` block, delete these two lines:

```json
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.8",
```

- [ ] **Step 2: Reinstall to update the lockfile**

Run: `npm install`
Expected: exits 0, `package-lock.json` no longer contains `@supabase/ssr` or `@supabase/supabase-js`

- [ ] **Step 3: Remove the empty Supabase migrations directory**

```bash
rm -rf supabase
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Remove unused Supabase dependencies and migrations directory"
```

---

### Task 5: Final verification

**Files:** None (verification only).

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds; the route list it prints no longer includes `/multiplayer`, `/multiplayer/[code]`, `/api/multiplayer/*`, `/freiestracking`, `/login`, `/profile`, `/auth/confirm`, `/error`

- [ ] **Step 4: Manual click-through (use the `run` skill to launch the dev server)**

- Visit `/` — loads, dark mode toggle works, only the Yatzy tile is clickable.
- Visit `/yatzy` — lobby loads, add/select players, start a game.
- Play one round on `/yatzy/Wunder` to completion — the score dialog opens with no console errors and no "Match speichern" button.
- Visit `/login`, `/profile`, `/multiplayer`, `/freiestracking` directly — all 404.

- [ ] **Step 5: Commit (only if the manual check above required fixes)**

```bash
git add -A
git commit -m "Fix issues found during repo cleanup verification"
```
