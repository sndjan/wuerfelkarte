# Unified Page Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace three inconsistent header styles (mainpage's plain header, the `Card`-wrapped dice-icon headers, and Yatzy's bare sticky div) with a single shared `PageHeader` component used on every page, so all headers share the same height, padding, and no-card look.

**Architecture:** One new component, `src/components/PageHeader.tsx`, renders a sticky `bg-background` bar with a `left`/`right` slot API. The mainpage passes a custom `left` (its brand wordmark); every other page uses the component's built-in `backHref`+`title` convenience path (ArrowLeft + title, linking to `/`). Each page keeps its existing right-side action components (Menu, Scoring, etc.) unchanged — only their container spacing moves from per-button `mr-4` to the shared `gap-3` slot.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind v4, `lucide-react` (`ArrowLeft`), existing `@/components/ui/button` and `Menu`/`Scoring`/etc. components — no new dependencies.

## Global Constraints

- This repo has no automated test runner (no jest/vitest/RTL in `package.json`). Per-task verification is `npx tsc --noEmit -p tsconfig.json` + `npm run lint`; full visual verification happens per-task via a quick manual browser check, with a comprehensive final pass across all pages in Task 11.
- `PageHeader` renders no `Card`, no border, no shadow — just `bg-background`. It is always `sticky top-0 z-30`, including on the mainpage (which is not sticky today).
- Title text is always static `text-2xl font-extrabold tracking-tight` — no responsive breakpoint scaling, no `scroll-m-20`/`mb-1`.
- The back arrow always links to `/` (a plain `Link`, not browser-history back).
- The dark-mode toggle stays mainpage-only; do not add it to any other page's header.
- Every page-specific right-side action (Menu, Scoring, AddPlayer, ResetGame, GamemodeInfo, profile button, DarkModeToggle) keeps its existing props and behavior — only its wrapping/margin classes change (individual `mr-4` → parent `gap-3` from `PageHeader`).
- After editing each page, remove imports that become unused in that file (checked per-task below: `Image` from `next/image`, `Dices`/`ArrowLeft` from `lucide-react`, `Link` from `next/link`) — only when confirmed unused elsewhere in that same file. Do not remove `Card` imports; every file that had one keeps using `Card` for non-header content.
- No changes to page content below the header (game boards, tables, forms, roster UI, payment flow, etc.), and no changes to what any right-side action does.

---

### Task 1: Create the `PageHeader` component

**Files:**
- Create: `src/components/PageHeader.tsx`

**Interfaces:**
- Produces: `PageHeader` component, props `{ left?: ReactNode; backHref?: string; title?: string; right?: ReactNode }`. If `left` is given, it's rendered as-is. Otherwise, renders a `Link` to `backHref` (falls back to `"/"`) containing an `ArrowLeft` icon + `title` as an `<h1>`. `right`, if given, renders in a `flex items-center gap-3` trailing container.

- [ ] **Step 1: Create the component**

`src/components/PageHeader.tsx`:

```tsx
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  left?: ReactNode;
  backHref?: string;
  title?: string;
  right?: ReactNode;
}

export function PageHeader({ left, backHref, title, right }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between bg-background px-4 py-4">
      {left ?? (
        <Link href={backHref ?? "/"} className="flex items-center">
          <ArrowLeft className="mr-2" size={20} />
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        </Link>
      )}
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `PageHeader.tsx`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors referencing `PageHeader.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/PageHeader.tsx
git commit -m "Add shared PageHeader component"
```

---

### Task 2: Migrate the mainpage (`/`)

**Files:**
- Modify: `src/app/page.tsx` (full file)

**Interfaces:**
- Consumes: `PageHeader` (Task 1).

- [ ] **Step 1: Replace the file contents**

`src/app/page.tsx` (full file):

```tsx
"use client";

import { DarkModeToggle } from "@/components/DarkModeToggle";
import { games } from "@/components/games/games";
import { GameTile } from "@/components/games/GameTile";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

const PROFILE_ACTIVE = process.env.NEXT_PUBLIC_PROFILE_ACTIVE === "true";

export default function GamesOverview() {
  const router = useRouter();

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
        right={
          <>
            {PROFILE_ACTIVE && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => router.push("/profile")}
                aria-label="Profil"
              >
                <UserRound />
              </Button>
            )}
            <DarkModeToggle />
          </>
        }
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

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run `npm run dev`, open `/`. Confirm: header has no border/card, wordmark on the left, profile button (if `NEXT_PUBLIC_PROFILE_ACTIVE=true`) + dark-mode toggle on the right, header sticks to the top when you scroll (if the game grid is tall enough to scroll — resize the window if needed).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "Migrate mainpage header to shared PageHeader"
```

---

### Task 3: Migrate `/yatzy`

**Files:**
- Modify: `src/app/yatzy/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 1).

- [ ] **Step 1: Update imports**

In `src/app/yatzy/page.tsx`, replace:

```tsx
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { usePlayerRoster } from "@/components/hooks/usePlayerRoster";
import { AddPlayerDialog } from "@/components/yatzy-lobby/AddPlayerDialog";
import { GamemodePillSelector } from "@/components/yatzy-lobby/GamemodePillSelector";
import { PlayerChip } from "@/components/yatzy-lobby/PlayerChip";
import { RecentMatchesList } from "@/components/yatzy-lobby/RecentMatchesList";
import { ArrowLeft, Dices } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
```

with:

```tsx
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { usePlayerRoster } from "@/components/hooks/usePlayerRoster";
import { PageHeader } from "@/components/PageHeader";
import { AddPlayerDialog } from "@/components/yatzy-lobby/AddPlayerDialog";
import { GamemodePillSelector } from "@/components/yatzy-lobby/GamemodePillSelector";
import { PlayerChip } from "@/components/yatzy-lobby/PlayerChip";
import { RecentMatchesList } from "@/components/yatzy-lobby/RecentMatchesList";
import { Dices } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
```

- [ ] **Step 2: Replace the header block**

Replace:

```tsx
      <div className="w-full sticky bg-background right-0 top-0">
        <div className="mx-4 p-4 flex flex-row items-center sticky top-4 z-30">
          <Link href="/" className="flex flex-row items-center">
            <ArrowLeft className="mr-2" size={20} />
            <h1 className="scroll-m-20 sm:text-2xl mb-1 font-extrabold tracking-tight lg:text-3xl text-xl">
              Yatzy
            </h1>
          </Link>
        </div>
      </div>
```

with:

```tsx
      <PageHeader backHref="/" title="Yatzy" />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual check**

Open `/yatzy`. Confirm: header shows back-arrow + "Yatzy", no card/border, same height as the mainpage header, no right-side content, back arrow navigates to `/`.

- [ ] **Step 6: Commit**

```bash
git add src/app/yatzy/page.tsx
git commit -m "Migrate /yatzy header to shared PageHeader"
```

---

### Task 4: Migrate `/profile`

**Files:**
- Modify: `src/app/profile/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 1).

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { Menu } from "@/components/Menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { Dices, LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayNameEditor } from "./DisplayNameEditor";
```

with:

```tsx
import { Menu } from "@/components/Menu";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { DisplayNameEditor } from "./DisplayNameEditor";
```

- [ ] **Step 2: Replace the header block**

Replace:

```tsx
  return (
    <div>
      <Card className="m-4 p-4 flex flex-row justify-between items-center">
        <Link href="/" className="flex flex-row ">
          <Dices size={32} strokeWidth={2.5} />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl">
            Würfelkarte
          </h1>
        </Link>
        <div className="flex flex-row gap-2">
          <Menu />
        </div>
      </Card>
```

with:

```tsx
  return (
    <div>
      <PageHeader backHref="/" title="Würfelkarte" right={<Menu />} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual check**

With `NEXT_PUBLIC_PROFILE_ACTIVE`/`PROFILE_ACTIVE` enabled and logged in, open `/profile`. Confirm: header shows back-arrow + "Würfelkarte", no card/border, `Menu` still opens on the right, back arrow navigates to `/`.

- [ ] **Step 6: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "Migrate /profile header to shared PageHeader"
```

---

### Task 5: Migrate `/login`

**Files:**
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 1).

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { Menu } from "@/components/Menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dices } from "lucide-react";
import Link from "next/link";
import { login, signup } from "./actions";
```

with:

```tsx
import { Menu } from "@/components/Menu";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login, signup } from "./actions";
```

- [ ] **Step 2: Replace the header block**

Replace:

```tsx
  return (
    <div className={`flex flex-col`}>
      <Card className="m-4 p-4 flex flex-row justify-between items-center">
        <Link href="/" className="flex flex-row ">
          <Dices size={32} strokeWidth={2.5} />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl">
            Würfelkarte
          </h1>
        </Link>
        <div className="flex flex-row gap-2">
          <Menu />
        </div>
      </Card>
```

with:

```tsx
  return (
    <div className={`flex flex-col`}>
      <PageHeader backHref="/" title="Würfelkarte" right={<Menu />} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual check**

With login enabled, open `/login`. Confirm: header shows back-arrow + "Würfelkarte", no card/border, `Menu` opens on the right, back arrow navigates to `/`.

- [ ] **Step 6: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "Migrate /login header to shared PageHeader"
```

---

### Task 6: Migrate `/freiestracking`

**Files:**
- Modify: `src/app/freiestracking/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 1).

- [ ] **Step 1: Update imports**

Replace:

```tsx
import AddPlayer from "@/components/AddPlayer";
import FreeTrackingCard from "@/components/FreeTrackingCard";
import { FreeTrackingScoring } from "@/components/FreeTrackingScoring";
import { useFreeTracking } from "@/components/hooks/useFreeTracking";
import { Menu } from "@/components/Menu";
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
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
```

with:

```tsx
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
```

- [ ] **Step 2: Replace the header block**

Replace:

```tsx
      {/* Header */}
      <Card className="m-4 p-4 flex flex-row justify-between items-center sticky top-4 z-10">
        <Link href="/" className="flex flex-row items-center">
          <Image
            src="/images/dice.png"
            alt="Dice"
            width={512}
            height={512}
            className="w-8 h-8"
          />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl mr-4">
            Freies Tracking
          </h1>
        </Link>
        <div className="flex flex-row">
          <FreeTrackingScoring players={players} settings={settings}>
            <Button variant="outline" className="mr-4">
              <Trophy />
              <span className="hidden sm:block">Punkteauswertung</span>
            </Button>
          </FreeTrackingScoring>
          <div className="mr-4 hidden sm:block">
            <AddPlayer addPlayer={addPlayer}>
              <Button variant="outline">
                <UserRoundPlus />
              </Button>
            </AddPlayer>
          </div>
          <div className="mr-4 hidden sm:block">
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
        </div>
      </Card>
```

with:

```tsx
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual check**

Open `/freiestracking`. Confirm: header shows back-arrow + "Freies Tracking", no card/border, "Punkteauswertung"/AddPlayer/ResetGame/Menu all still work and are evenly spaced, header sticks on scroll, back arrow navigates to `/`.

- [ ] **Step 6: Commit**

```bash
git add src/app/freiestracking/page.tsx
git commit -m "Migrate /freiestracking header to shared PageHeader"
```

---

### Task 7: Migrate `/multiplayer`

**Files:**
- Modify: `src/app/multiplayer/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 1).

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dices, LogIn, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
```

with:

```tsx
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dices, LogIn, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
```

- [ ] **Step 2: Replace the header block**

Replace:

```tsx
      <Card className="m-4 p-4 flex flex-row justify-between items-center">
        <Link href="/" className="flex flex-row items-center">
          <Image
            src="/images/dice.png"
            alt="Dice"
            width={512}
            height={512}
            className="w-8 h-8"
          />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl">
            Multiplayer
          </h1>
        </Link>
      </Card>
```

with:

```tsx
      <PageHeader backHref="/" title="Multiplayer" />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual check**

Open `/multiplayer`. Confirm: header shows back-arrow + "Multiplayer", no card/border, no right-side content, "Raum beitreten"/"Raum erstellen" cards below still work, back arrow navigates to `/`.

- [ ] **Step 6: Commit**

```bash
git add src/app/multiplayer/page.tsx
git commit -m "Migrate /multiplayer header to shared PageHeader"
```

---

### Task 8: Migrate `/multiplayer/[code]` (lobby and game states)

**Files:**
- Modify: `src/app/multiplayer/[code]/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 1).

- [ ] **Step 1: Update imports**

Replace:

```tsx
import {
  Mission,
  missions as chaosMissions,
} from "@/components/gamemodes/chaoswunder";
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Points } from "@/components/hooks/types";
import { useMultiplayerGame } from "@/components/hooks/useMultiplayerGame";
import { useTheme } from "@/components/hooks/useTheme";
import { Menu } from "@/components/Menu";
import PlayerCard from "@/components/PlayerCard";
import { Scoring } from "@/components/Scoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Construction,
  Dices,
  Loader2,
  Share2,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
```

with:

```tsx
import {
  Mission,
  missions as chaosMissions,
} from "@/components/gamemodes/chaoswunder";
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Points } from "@/components/hooks/types";
import { useMultiplayerGame } from "@/components/hooks/useMultiplayerGame";
import { useTheme } from "@/components/hooks/useTheme";
import { Menu } from "@/components/Menu";
import { PageHeader } from "@/components/PageHeader";
import PlayerCard from "@/components/PlayerCard";
import { Scoring } from "@/components/Scoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Construction,
  Dices,
  Loader2,
  Share2,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
```

(`Link` stays — it's still used by the error-state `<Link href="/multiplayer">` block later in the file.)

- [ ] **Step 2: Replace the lobby-state header block**

Replace:

```tsx
      <>
        <Card className="m-4 p-4 flex flex-row justify-between items-center">
          <Link href="/" className="flex flex-row items-center">
            <Image
              src="/images/dice.png"
              alt="Dice"
              width={512}
              height={512}
              className="w-8 h-8"
            />
            <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl">
              {gamemodes[room.gamemode as keyof typeof gamemodes]?.name ??
                room.gamemode}
            </h1>
          </Link>
          <Menu
            resetAllPoints={resetAllPlayersPoints}
            specialTheme={theme}
            isThemeActive={isThemeActive}
            setIsThemeActive={setIsThemeActive}
            gamemodeInfo={gamemode ? gamemodes[gamemode]?.information : undefined}
          />
        </Card>
```

with:

```tsx
      <>
        <PageHeader
          backHref="/"
          title={
            gamemodes[room.gamemode as keyof typeof gamemodes]?.name ??
            room.gamemode
          }
          right={
            <Menu
              resetAllPoints={resetAllPlayersPoints}
              specialTheme={theme}
              isThemeActive={isThemeActive}
              setIsThemeActive={setIsThemeActive}
              gamemodeInfo={gamemode ? gamemodes[gamemode]?.information : undefined}
            />
          }
        />
```

- [ ] **Step 3: Replace the game-state header block**

Replace:

```tsx
      <Card className="m-4 p-4 flex flex-row justify-between items-center top-4 z-10">
        <Link href="/" className="flex flex-row items-center">
          <Image
            src="/images/dice.png"
            alt="Dice"
            width={512}
            height={512}
            className="w-8 h-8"
          />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl mr-4">
            {gamemodes[room.gamemode as keyof typeof gamemodes]?.name ??
              room.gamemode}
          </h1>
        </Link>
        <div className="flex flex-row items-center gap-3">
          <button
            onClick={shareRoom}
            className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
            aria-label="Raum teilen"
          >
            <Share2 size={12} />
            {code}
          </button>
          <Scoring
            players={scoringPlayers as Parameters<typeof Scoring>[0]["players"]}
            gamemode={room.gamemode as keyof typeof gamemodes}
          >
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
          <Menu
            resetAllPoints={resetAllPlayersPoints}
            specialTheme={theme}
            isThemeActive={isThemeActive}
            setIsThemeActive={setIsThemeActive}
            gamemodeInfo={gamemode ? gamemodes[gamemode]?.information : undefined}
          />
        </div>
      </Card>
```

with:

```tsx
      <PageHeader
        backHref="/"
        title={
          gamemodes[room.gamemode as keyof typeof gamemodes]?.name ??
          room.gamemode
        }
        right={
          <>
            <button
              onClick={shareRoom}
              className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
              aria-label="Raum teilen"
            >
              <Share2 size={12} />
              {code}
            </button>
            <Scoring
              players={scoringPlayers as Parameters<typeof Scoring>[0]["players"]}
              gamemode={room.gamemode as keyof typeof gamemodes}
            >
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
            <Menu
              resetAllPoints={resetAllPlayersPoints}
              specialTheme={theme}
              isThemeActive={isThemeActive}
              setIsThemeActive={setIsThemeActive}
              gamemodeInfo={gamemode ? gamemodes[gamemode]?.information : undefined}
            />
          </>
        }
      />
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Manual check**

Create or join a multiplayer room. In the lobby state, confirm: header shows back-arrow + gamemode name, `Menu` still works, no card/border. Start the game and confirm the in-game header shows back-arrow + gamemode name, the room-code share button, `Scoring`, and `Menu` all still work, evenly spaced. Confirm the error state (bad room code) still shows its own "Zurück" button unaffected.

- [ ] **Step 7: Commit**

```bash
git add "src/app/multiplayer/[code]/page.tsx"
git commit -m "Migrate /multiplayer/[code] headers to shared PageHeader"
```

---

### Task 9: Migrate `/[gamemode]`

**Files:**
- Modify: `src/app/[gamemode]/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 1).

- [ ] **Step 1: Update imports**

Replace:

```tsx
import AddPlayer from "@/components/AddPlayer";
import GamemodeInfo from "@/components/GamemodeInfo";
import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Points } from "@/components/hooks/types";
import { useKniffel } from "@/components/hooks/useKniffel";
import { Menu } from "@/components/Menu";
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
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/hooks/useTheme";
import {
  Mission,
  missions as chaosMissions,
} from "@/components/gamemodes/chaoswunder";
import { toast } from "sonner";
```

with:

```tsx
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
```

- [ ] **Step 2: Replace the header block**

Replace:

```tsx
      <Card className="m-4 p-4 flex flex-row justify-between items-center top-4 z-10">
        <Link href="/" className="flex flex-row ">
          <Image
            src="/images/dice.png"
            alt="Dice"
            width={512}
            height={512}
            className="w-8 h-8"
          />
          <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl mr-4">
            {gamemodes[gamemode].name}
          </h1>
        </Link>
        <div className="flex flex-row">
          <Scoring players={players} gamemode={gamemode}>
            <Button
              variant="outline"
              className={`mr-4  ${
                gameFinished
                  ? "dark:bg-yellow-400 bg-yellow-400 hover:bg-yellow-500 dark:text-black"
                  : ""
              }`}
            >
              <Trophy />
              <span className="hidden sm:block">Punkteauswertung</span>
            </Button>
          </Scoring>
          <div className="mr-4 hidden sm:block">
            <AddPlayer addPlayer={addPlayer}>
              <Button variant="outline">
                <UserRoundPlus />
              </Button>
            </AddPlayer>
          </div>
          <div className="mr-4 hidden sm:block">
            <ResetGame resetAllPoints={resetAllPoints}>
              <Button variant="outline">
                <RotateCcw />
              </Button>
            </ResetGame>
          </div>
          {gamemodes[gamemode].information && (
            <div className="mr-4 hidden sm:block">
              <GamemodeInfo gamemodeInfo={gamemodes[gamemode].information} />
            </div>
          )}
          {/* <div className="hidden sm:block flex-row mr-4">
            <ModeToggle />
          </div> */}
          <Menu
            resetAll={resetAll}
            resetAllPoints={resetAllPoints}
            addPlayer={addPlayer}
            specialTheme={theme}
            isThemeActive={isThemeActive}
            setIsThemeActive={setIsThemeActive}
            gamemodeInfo={gamemodes[gamemode].information}
          />
        </div>
      </Card>
```

with:

```tsx
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual check**

Open any gamemode, e.g. `/wunder`. Confirm: header shows back-arrow + gamemode name, no card/border, "Punkteauswertung"/AddPlayer/ResetGame/GamemodeInfo/Menu all still work, back arrow navigates to `/`. Play `/chaoswunder` and confirm the mission card below the header is unaffected.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[gamemode]/page.tsx"
git commit -m "Migrate /[gamemode] header to shared PageHeader"
```

---

### Task 10: Add a header to `/checkout/[gamemode]`

**Files:**
- Modify: `src/app/checkout/[gamemode]/page.tsx` (full file)

**Interfaces:**
- Consumes: `PageHeader` (Task 1).

- [ ] **Step 1: Replace the file contents**

`src/app/checkout/[gamemode]/page.tsx` (full file):

```tsx
"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Checkout } from "@/components/payment/Checkout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { convertToSubcurrency } from "@/lib/utils";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

if (process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY === undefined) {
  throw new Error("NEXT_PUBLIC_STRIPE_PUBLIC_KEY is not defined");
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const gamemodeParam = (params.gamemode as string) || "";
  const gamemodeKey = Object.keys(gamemodes).find(
    (key) =>
      key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ===
      gamemodeParam.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  ) as keyof typeof gamemodes;
  const gamemode = gamemodes[gamemodeKey];
  const [purchased, setPurchased] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const bought = localStorage.getItem("purchasedGamemodes");
      setPurchased(bought ? JSON.parse(bought) : ["Klassiker"]);
    }
  }, []);

  // On successful payment, unlock gamemode and redirect
  const handleSuccess = () => {
    const normalizedKey = gamemodeKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    const updated = Array.from(new Set([...(purchased || []), normalizedKey]));
    localStorage.setItem("purchasedGamemodes", JSON.stringify(updated));
    router.push("/");
  };

  if (!gamemode) {
    return <div>Gamemode nicht gefunden.</div>;
  }

  return (
    <>
      <PageHeader backHref="/" title={gamemode.name} />
      <div className="flex flex-col items-center justify-center m-8">
        <div className="flex flex-col items-center">
          <Image
            src="/images/dice.png"
            alt="Dice"
            width={512}
            height={512}
            className="w-8 h-8"
          />
          <h2 className="text-2xl font-bold mb-1">
            {gamemode.name} freischalten
          </h2>
          <div className="text-gray-500 mb-4 text-center">
            {gamemode.description}
          </div>
          <div className="text-3xl font-extrabold mb-4">
            {gamemode.price?.toFixed(2)} €
          </div>
        </div>
        <Elements
          stripe={stripePromise}
          options={{
            mode: "payment",
            amount: convertToSubcurrency(gamemode.price || 0),
            currency: "eur",
          }}
        >
          <Checkout amount={gamemode.price || 0} onSuccess={handleSuccess} />
        </Elements>
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => router.push("/")}
        >
          Abbrechen
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual check**

Trigger a checkout flow for a paid gamemode (or navigate to `/checkout/<a-paid-gamemode-key>` directly). Confirm: a header now appears above the payment card with back-arrow + gamemode name, no card/border, back arrow navigates to `/`, and the existing payment summary/Stripe form/"Abbrechen" button below are unaffected.

- [ ] **Step 5: Commit**

```bash
git add "src/app/checkout/[gamemode]/page.tsx"
git commit -m "Add PageHeader to /checkout/[gamemode]"
```

---

### Task 11: Full cross-page verification

**Files:** none (verification only — no commit for this task).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: starts without compile errors.

- [ ] **Step 2: Height/style consistency pass**

Open `/`, `/yatzy`, `/profile`, `/login`, `/freiestracking`, `/multiplayer`, a multiplayer room (lobby + in-game), a gamemode page (e.g. `/wunder`), and `/checkout/<paid-gamemode>` in sequence. Confirm every header: has no visible card border/shadow, uses the same background as the page, is the same height, and uses the same `text-2xl font-extrabold` title weight/size (mainpage's wordmark included).

- [ ] **Step 3: Sticky behavior pass**

On a page with enough content to scroll (e.g. a gamemode page with several players, or `/freiestracking`), scroll down and confirm the header stays pinned at the top on every page, including the mainpage.

- [ ] **Step 4: Back-navigation pass**

From each non-mainpage header, click the back arrow and confirm it returns to `/` — including from mid-game on a gamemode page and from an active multiplayer room.

- [ ] **Step 5: Right-side actions pass**

Confirm each page's right-side header actions still work: mainpage's profile button + dark-mode toggle, `Menu` (profile/login/multiplayer-lobby), `Scoring`/`AddPlayer`/`ResetGame`/`GamemodeInfo`/`Menu` (gamemode page), `FreeTrackingScoring`/`AddPlayer`/`ResetGame`/`Menu` (freies tracking), the room-code share button + `Scoring` + `Menu` (multiplayer in-game).

- [ ] **Step 6: Light/dark mode pass**

Toggle dark mode (via the mainpage's `DarkModeToggle`) and revisit two or three of the pages above — confirm header background/text/icons stay legible in both themes.
