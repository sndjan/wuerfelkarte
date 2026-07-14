# Yatzy Lobby Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/yatzy`'s current "gamemode grid" page with a pre-game lobby: a persistent player roster with emoji avatars, a gamemode pill picker, a "Spiel starten" action, and a recent-matches list.

**Architecture:** A new `kniffel:roster` localStorage-backed hook (`usePlayerRoster`) manages `{ id, name, emoji, active }` players entirely independently of the existing `useKniffel`/`Player` gameplay state. New presentational components (`PlayerChip`, `PlayerEditMenu`, `AddPlayerDialog`, `GamemodePillSelector`, `RecentMatchesList`) are composed into a rewritten `src/app/yatzy/page.tsx`. When starting a game, the page writes the active roster's names into the existing `kniffel:player-names` key (the format `[gamemode]/page.tsx`'s `useKniffel` already reads) and navigates — so the actual gameplay page needs zero code changes.

**Tech Stack:** Next.js 15 (App Router) client components, React 19, Tailwind v4 (existing `tracky.fun` color tokens), shadcn/Radix `Dialog`/`Button`/`Input`/`Card` primitives already in `src/components/ui/`.

## Global Constraints

- Fixed emoji set, exactly these 8, in this order: 🦄 🔥 😎 🐸 🐼 🦊 🐧 ⚡.
- Do not modify `src/app/[gamemode]/page.tsx`, `src/components/hooks/useKniffel.ts`, `src/components/hooks/types.ts` (`Player` type), or `src/components/PlayerCard.tsx`. Emoji avatars are lobby-only.
- `/yatzy`'s header keeps back-arrow + dice icon + "Yatzy" title (unchanged) but drops the `Menu` dropdown and the `PROFILE_ACTIVE` profile button — header right side is empty.
- No locked/paid-mode UI on this page (every entry in `gamemodes` currently has `price: 0`).
- Do not migrate the legacy `kniffel:player-names` (name-only) data into the new roster — the roster starts empty for all users.
- Do not change how `src/components/Scoring.tsx` writes `lastMatches` (`{ players, gamemode, timestamp }`) — read-only consumption in this feature.
- New storage key for the roster: `kniffel:roster`.
- This repo has no automated test runner (no jest/vitest/RTL in `package.json`). Per-task verification uses `npx tsc --noEmit -p tsconfig.json` as a compile-correctness gate; full behavioral verification happens once everything is wired into the page (final task), via the `run` skill / manual browser check — this matches how the existing `docs/superpowers/specs/2026-07-14-mainpage-games-overview-design.md` work was verified.

---

### Task 1: Player roster data layer

**Files:**
- Create: `src/components/yatzy-lobby/types.ts`
- Create: `src/components/hooks/usePlayerRoster.ts`

**Interfaces:**
- Produces: `RosterPlayer` type `{ id: string; name: string; emoji: string; active: boolean }`, `EMOJI_OPTIONS: string[]` (both from `types.ts`).
- Produces: `usePlayerRoster()` returning `{ roster: RosterPlayer[]; addPlayer(name: string, emoji: string): void; toggleActive(id: string): void; renamePlayer(id: string, name: string): void; changeEmoji(id: string, emoji: string): void; removePlayer(id: string): void }`.

- [ ] **Step 1: Create the roster types file**

`src/components/yatzy-lobby/types.ts`:

```ts
export type RosterPlayer = {
  id: string;
  name: string;
  emoji: string;
  active: boolean;
};

export const EMOJI_OPTIONS = ["🦄", "🔥", "😎", "🐸", "🐼", "🦊", "🐧", "⚡"];
```

- [ ] **Step 2: Create the `usePlayerRoster` hook**

`src/components/hooks/usePlayerRoster.ts`:

```ts
import { useEffect, useState } from "react";
import { RosterPlayer } from "@/components/yatzy-lobby/types";

const STORAGE_KEY = "kniffel:roster";

const loadRosterFromStorage = (): RosterPlayer[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RosterPlayer[];
  } catch {
    return [];
  }
};

const saveRosterToStorage = (roster: RosterPlayer[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
  } catch {
    // Handle storage errors silently
  }
};

export function usePlayerRoster() {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  // Guards the save effect from overwriting stored data with the initial
  // empty array before the load effect has had a chance to run.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRoster(loadRosterFromStorage());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveRosterToStorage(roster);
    }
  }, [roster, loaded]);

  const addPlayer = (name: string, emoji: string) => {
    setRoster((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, emoji, active: true },
    ]);
  };

  const toggleActive = (id: string) => {
    setRoster((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    );
  };

  const renamePlayer = (id: string, name: string) => {
    setRoster((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const changeEmoji = (id: string, emoji: string) => {
    setRoster((prev) => prev.map((p) => (p.id === id ? { ...p, emoji } : p)));
  };

  const removePlayer = (id: string) => {
    setRoster((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    roster,
    addPlayer,
    toggleActive,
    renamePlayer,
    changeEmoji,
    removePlayer,
  };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `types.ts` or `usePlayerRoster.ts`. (Errors unrelated to these two files, if any pre-exist in the repo, are not this task's concern — but there should be none since this is a purely additive change.)

- [ ] **Step 4: Commit**

```bash
git add src/components/yatzy-lobby/types.ts src/components/hooks/usePlayerRoster.ts
git commit -m "Add player roster data layer for the yatzy lobby"
```

---

### Task 2: PlayerChip + PlayerEditMenu

**Files:**
- Create: `src/components/yatzy-lobby/PlayerEditMenu.tsx`
- Create: `src/components/yatzy-lobby/PlayerChip.tsx`

**Interfaces:**
- Consumes: `RosterPlayer`, `EMOJI_OPTIONS` from `src/components/yatzy-lobby/types.ts` (Task 1).
- Produces: `PlayerChip` component, props `{ player: RosterPlayer; onToggleActive(id: string): void; onRename(id: string, name: string): void; onChangeEmoji(id: string, emoji: string): void; onRemove(id: string): void }`. Tap toggles active; press-and-hold (500ms) opens `PlayerEditMenu`.
- Produces: `PlayerEditMenu` component, props `{ player: RosterPlayer; open: boolean; onOpenChange(open: boolean): void; onRename(id: string, name: string): void; onChangeEmoji(id: string, emoji: string): void; onRemove(id: string): void }`.

- [ ] **Step 1: Create `PlayerEditMenu`**

`src/components/yatzy-lobby/PlayerEditMenu.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EMOJI_OPTIONS, RosterPlayer } from "./types";

interface PlayerEditMenuProps {
  player: RosterPlayer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => void;
  onChangeEmoji: (id: string, emoji: string) => void;
  onRemove: (id: string) => void;
}

export function PlayerEditMenu({
  player,
  open,
  onOpenChange,
  onRename,
  onChangeEmoji,
  onRemove,
}: PlayerEditMenuProps) {
  const [name, setName] = useState(player.name);
  const [emoji, setEmoji] = useState(player.emoji);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(player.name);
      setEmoji(player.emoji);
    }
    onOpenChange(next);
  };

  const handleSave = () => {
    if (name.trim()) {
      onRename(player.id, name.trim());
      onChangeEmoji(player.id, emoji);
    }
    onOpenChange(false);
  };

  const handleRemove = () => {
    onRemove(player.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Spieler bearbeiten</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Ändere Name oder Emoji, oder entferne den Spieler aus der Liste.
        </DialogDescription>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-4 gap-2">
          {EMOJI_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              className={
                option === emoji
                  ? "flex h-14 items-center justify-center rounded-xl bg-primary text-2xl"
                  : "flex h-14 items-center justify-center rounded-xl bg-secondary text-2xl"
              }
            >
              {option}
            </button>
          ))}
        </div>
        <DialogFooter className="flex flex-row justify-between sm:justify-between">
          <Button type="button" variant="destructive" onClick={handleRemove}>
            Entfernen
          </Button>
          <Button type="button" onClick={handleSave} disabled={!name.trim()}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `PlayerChip`**

`src/components/yatzy-lobby/PlayerChip.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { PlayerEditMenu } from "./PlayerEditMenu";
import { RosterPlayer } from "./types";

const LONG_PRESS_MS = 500;

interface PlayerChipProps {
  player: RosterPlayer;
  onToggleActive: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onChangeEmoji: (id: string, emoji: string) => void;
  onRemove: (id: string) => void;
}

export function PlayerChip({
  player,
  onToggleActive,
  onRename,
  onChangeEmoji,
  onRemove,
}: PlayerChipProps) {
  const [editOpen, setEditOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const startPress = () => {
    longPressFiredRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setEditOpen(true);
    }, LONG_PRESS_MS);
  };

  const clearPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = () => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    onToggleActive(player.id);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={startPress}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        className={
          player.active
            ? "flex select-none items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground"
            : "flex select-none items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-foreground"
        }
      >
        <span className="text-lg">{player.emoji}</span>
        <span className="font-semibold">{player.name}</span>
      </button>
      <PlayerEditMenu
        player={player}
        open={editOpen}
        onOpenChange={setEditOpen}
        onRename={onRename}
        onChangeEmoji={onChangeEmoji}
        onRemove={onRemove}
      />
    </>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `PlayerChip.tsx` or `PlayerEditMenu.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/yatzy-lobby/PlayerChip.tsx src/components/yatzy-lobby/PlayerEditMenu.tsx
git commit -m "Add PlayerChip and PlayerEditMenu components"
```

---

### Task 3: AddPlayerDialog

**Files:**
- Create: `src/components/yatzy-lobby/AddPlayerDialog.tsx`

**Interfaces:**
- Consumes: `EMOJI_OPTIONS` from `src/components/yatzy-lobby/types.ts` (Task 1).
- Produces: `AddPlayerDialog` component, props `{ onAdd(name: string, emoji: string): void }`. Renders its own trigger (the "+" chip).

- [ ] **Step 1: Create `AddPlayerDialog`**

`src/components/yatzy-lobby/AddPlayerDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EMOJI_OPTIONS } from "./types";

interface AddPlayerDialogProps {
  onAdd: (name: string, emoji: string) => void;
}

export function AddPlayerDialog({ onAdd }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), emoji);
    setName("");
    setEmoji(EMOJI_OPTIONS[0]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xl font-bold text-accent-foreground"
          aria-label="Spieler hinzufügen"
        >
          +
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Neuer Spieler</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Gib einen Namen ein und wähle ein Emoji für den neuen Spieler.
        </DialogDescription>
        <Input
          placeholder="Name eingeben..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Wähle ein Emoji
          </p>
          <div className="grid grid-cols-4 gap-2">
            {EMOJI_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEmoji(option)}
                className={
                  option === emoji
                    ? "flex h-14 items-center justify-center rounded-xl bg-primary text-2xl"
                    : "flex h-14 items-center justify-center rounded-xl bg-secondary text-2xl"
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleAdd} disabled={!name.trim()}>
            Hinzufügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `AddPlayerDialog.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/yatzy-lobby/AddPlayerDialog.tsx
git commit -m "Add AddPlayerDialog component"
```

---

### Task 4: GamemodePillSelector

**Files:**
- Create: `src/components/yatzy-lobby/GamemodePillSelector.tsx`

**Interfaces:**
- Consumes: `gamemodes` from `src/components/gamemodes/gamemodes.ts` (existing, unmodified).
- Produces: `GamemodePillSelector` component, props `{ value: string; onChange(key: string): void }` where `value`/the callback's `key` argument are keys of `gamemodes` (e.g. `"Wunder"`, `"WunderPlus"`).

- [ ] **Step 1: Create `GamemodePillSelector`**

`src/components/yatzy-lobby/GamemodePillSelector.tsx`:

```tsx
"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";

interface GamemodePillSelectorProps {
  value: string;
  onChange: (key: string) => void;
}

export function GamemodePillSelector({
  value,
  onChange,
}: GamemodePillSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(gamemodes).map(([key, mode]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={
            key === value
              ? "rounded-full bg-brand-accent px-4 py-2 font-semibold text-white"
              : "rounded-full border border-border bg-card px-4 py-2 font-semibold text-foreground"
          }
        >
          {mode.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `GamemodePillSelector.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/yatzy-lobby/GamemodePillSelector.tsx
git commit -m "Add GamemodePillSelector component"
```

---

### Task 5: RecentMatchesList

**Files:**
- Create: `src/components/yatzy-lobby/RecentMatchesList.tsx`

**Interfaces:**
- Consumes: `gamemodes` from `src/components/gamemodes/gamemodes.ts` (for display names); reads the existing `lastMatches` localStorage key written by `src/components/Scoring.tsx` (shape: `{ players: { name: string; score: number }[]; gamemode: string; timestamp: string }[]`, unmodified).
- Produces: `RecentMatchesList` component, no props. Renders nothing (`null`) if there are no stored matches.

- [ ] **Step 1: Create `RecentMatchesList`**

`src/components/yatzy-lobby/RecentMatchesList.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { gamemodes } from "@/components/gamemodes/gamemodes";

type StoredMatchPlayer = { name: string; score: number };

type StoredMatch = {
  players: StoredMatchPlayer[];
  gamemode: string;
  timestamp: string;
};

const MAX_MATCHES = 5;

function formatShortDate(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

function loadRecentMatches(): StoredMatch[] {
  try {
    const stored = localStorage.getItem("lastMatches");
    if (!stored) return [];
    const parsed: StoredMatch[] = JSON.parse(stored);
    return [...parsed]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, MAX_MATCHES);
  } catch {
    return [];
  }
}

export function RecentMatchesList() {
  const [matches, setMatches] = useState<StoredMatch[]>([]);

  useEffect(() => {
    setMatches(loadRecentMatches());
  }, []);

  if (matches.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Letzte Spiele
      </h2>
      {matches.map((match, index) => {
        const winner = [...match.players].sort((a, b) => b.score - a.score)[0];
        const modeName =
          gamemodes[match.gamemode as keyof typeof gamemodes]?.name ??
          match.gamemode;
        return (
          <div
            key={`${match.timestamp}-${index}`}
            className="flex items-center justify-between rounded-2xl bg-card p-4"
          >
            <div>
              <p className="font-bold">
                {modeName} · {formatShortDate(match.timestamp)}
              </p>
              <p className="text-sm text-muted-foreground">
                {match.players.map((p) => p.name).join(", ")}
              </p>
            </div>
            {winner && (
              <p className="font-bold text-brand-accent">
                🏆 {winner.name} · {winner.score}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `RecentMatchesList.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/yatzy-lobby/RecentMatchesList.tsx
git commit -m "Add RecentMatchesList component"
```

---

### Task 6: Rewrite `/yatzy` page and verify end-to-end

**Files:**
- Modify: `src/app/yatzy/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `usePlayerRoster` (Task 1), `PlayerChip` (Task 2), `AddPlayerDialog` (Task 3), `GamemodePillSelector` (Task 4), `RecentMatchesList` (Task 5), `gamemodes` (existing).
- Produces: the final `/yatzy` route. Writes to the existing `kniffel:player-names` localStorage key on "Spiel starten" and navigates to `/${gamemodeKey.toLowerCase()}`, which `src/app/[gamemode]/page.tsx` already resolves case-insensitively.

- [ ] **Step 1: Replace the page contents**

`src/app/yatzy/page.tsx` (full file):

```tsx
"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { usePlayerRoster } from "@/components/hooks/usePlayerRoster";
import { Card } from "@/components/ui/card";
import { AddPlayerDialog } from "@/components/yatzy-lobby/AddPlayerDialog";
import { GamemodePillSelector } from "@/components/yatzy-lobby/GamemodePillSelector";
import { PlayerChip } from "@/components/yatzy-lobby/PlayerChip";
import { RecentMatchesList } from "@/components/yatzy-lobby/RecentMatchesList";
import { ArrowLeft, Dices } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PLAYER_NAMES_STORAGE_KEY = "kniffel:player-names";

export default function YatzyLobby() {
  const router = useRouter();
  const {
    roster,
    addPlayer,
    toggleActive,
    renamePlayer,
    changeEmoji,
    removePlayer,
  } = usePlayerRoster();
  const [selectedGamemode, setSelectedGamemode] = useState<
    keyof typeof gamemodes
  >(Object.keys(gamemodes)[0] as keyof typeof gamemodes);

  const activePlayers = roster.filter((player) => player.active);

  const handleStart = () => {
    if (activePlayers.length === 0) return;
    localStorage.setItem(
      PLAYER_NAMES_STORAGE_KEY,
      JSON.stringify(activePlayers.map((player) => player.name)),
    );
    router.push(`/${selectedGamemode.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
  };

  return (
    <>
      <div className="w-full sticky dark:bg-[#0a0a0a] bg-white h-25 right-0 top-0">
        <Card className="mx-4 p-4 flex flex-row items-center sticky top-4 z-30">
          <Link href="/" className="flex flex-row items-center">
            <ArrowLeft className="mr-2" size={20} />
            <Image
              src="/images/dice.png"
              alt="Dice"
              width={512}
              height={512}
              className="w-8 h-8"
            />
            <h1 className="scroll-m-20 sm:text-2xl mb-1 ml-4 font-extrabold tracking-tight lg:text-3xl text-xl">
              Yatzy
            </h1>
          </Link>
        </Card>
      </div>
      <div className="flex flex-col gap-6 px-4 pb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Spieler
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {roster.map((player) => (
              <PlayerChip
                key={player.id}
                player={player}
                onToggleActive={toggleActive}
                onRename={renamePlayer}
                onChangeEmoji={changeEmoji}
                onRemove={removePlayer}
              />
            ))}
            <AddPlayerDialog onAdd={addPlayer} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Spielmodus
          </h2>
          <GamemodePillSelector
            value={selectedGamemode}
            onChange={(key) =>
              setSelectedGamemode(key as keyof typeof gamemodes)
            }
          />
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={activePlayers.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Dices size={20} />
          Spiel starten
        </button>

        <RecentMatchesList />
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
Expected: no errors (warnings pre-existing elsewhere in the repo, if any, are not this task's concern).

- [ ] **Step 4: Start the dev server**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000` (or next available port) without compile errors.

- [ ] **Step 5: Manual verification — roster add/toggle/persist**

In the browser, navigate to `/yatzy`:
- Confirm the header shows back-arrow + dice + "Yatzy", with nothing on the right.
- Confirm "Spieler" is empty initially (no chips, just the `+` tile).
- Click `+`, enter a name, pick an emoji, click "Hinzufügen" — confirm a filled (dark) chip appears with that emoji + name.
- Add a second player the same way.
- Click a chip to toggle it — confirm it switches from filled/dark to outline/light and back.
- Reload the page — confirm both chips reappear with their last active/inactive state (check `localStorage.getItem("kniffel:roster")` in devtools to confirm the array shape matches `RosterPlayer[]`).

- [ ] **Step 6: Manual verification — long-press edit**

- Press and hold a chip for about half a second — confirm the "Spieler bearbeiten" dialog opens (a quick tap should NOT open it, only toggle).
- Change the name and emoji, click "Speichern" — confirm the chip updates.
- Long-press again, click "Entfernen" — confirm the chip disappears and stays gone after reload.

- [ ] **Step 7: Manual verification — gamemode selection**

- Confirm "Wunder" is selected (green pill) by default.
- Click each of the 5 pills (Wunder, Wunder+, Chaoswunder, Mini Wunder, Super Wunder) — confirm exactly one is green at a time and the rest are outline.

- [ ] **Step 8: Manual verification — start game**

- With 0 active players, confirm "Spiel starten" is disabled (greyed out, not clickable).
- Activate 1+ players, select a gamemode (e.g. "Chaoswunder"), click "Spiel starten".
- Confirm navigation to `/chaoswunder` and that the player list there exactly matches the active players' names, each starting at 0 points.
- Go back to `/yatzy` — confirm the roster (names, emoji, active state) is unchanged by having played.

- [ ] **Step 9: Manual verification — recent matches**

- On a profile with no match history yet, confirm "Letzte Spiele" is not rendered at all.
- In devtools console, seed one match to test rendering:
  ```js
  localStorage.setItem("lastMatches", JSON.stringify([
    { gamemode: "Wunder", timestamp: new Date().toISOString(),
      players: [{ name: "Jan", score: 198 }, { name: "Tina", score: 267 }] }
  ]));
  ```
  Reload `/yatzy` — confirm a row appears: "Wunder · <today's d.M.>", "Jan, Tina", and "🏆 Tina · 267".
- Alternatively/additionally, play a full game via "Spiel starten" through to a saved score (per `Scoring.tsx`'s existing save flow) and confirm it appears at the top of the list on return to `/yatzy`.

- [ ] **Step 10: Manual verification — light/dark mode**

- Toggle the OS/browser color scheme (or however dark mode is triggered in this app) and confirm chips, pills, the start button, and recent-match cards all remain legible (text contrast, no invisible borders) in both modes.

- [ ] **Step 11: Commit**

```bash
git add src/app/yatzy/page.tsx
git commit -m "Rewrite /yatzy as a player-roster and gamemode-picker lobby"
```
