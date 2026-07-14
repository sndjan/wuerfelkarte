# Mainpage Games Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the mainpage into a games catalog (Yatzy playable, Wizard/Cabo/Skull King "coming soon"), styled with a new color/typography system, moving today's Yatzy-variant selector to `/yatzy`.

**Architecture:** Two new/rewritten Next.js App Router pages (`src/app/page.tsx`, new `src/app/yatzy/page.tsx`), two new small presentational components (`GameTile`, `DarkModeToggle`), one new data file (`games.ts`), plus app-wide token/font edits in `globals.css` and `layout.tsx` that every existing page inherits.

**Tech Stack:** Next.js 15 (App Router, React 19), Tailwind CSS v4 (CSS-variable theme via `@theme inline`), shadcn-style UI primitives (`Button`, `Card`, `Badge`), `next-themes`, `lucide-react`, `next/font/google`.

## Global Constraints

- No automated test framework is configured in this repo (`package.json` has no `test` script). Verification per task uses `npx tsc --noEmit`, `npm run lint`, and a manual check via `npm run dev` in the browser — not unit tests.
- Path alias `@/` resolves to `src/` (see `tsconfig.json`).
- Tailwind v4 utility classes are generated from the `@theme inline` block in `src/app/globals.css` — any new CSS variable that needs a utility class (e.g. `bg-brand-badge`) must be added there.
- UI copy is German, matching the rest of the app (e.g. "BALD" for "coming soon").
- Do not change route logic in `/[gamemode]`, `/checkout`, `/profile`, `/multiplayer`, `/freiestracking` — they only inherit the new color/font tokens automatically, no hand edits.
- `/freiestracking` route stays in the codebase untouched; only its mainpage entry-point card is removed (not relocated).
- Highscores and "Idee vorschlagen" (feature request) UI are deleted, not relocated, per the spec's non-goals.

---

### Task 1: App-wide color tokens

**Files:**
- Modify: `src/app/globals.css:7-74` (the `:root` and `.dark` blocks), and `:112` area (the `@theme inline` block)

**Interfaces:**
- Produces: CSS custom properties `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--border`, `--input`, `--ring` (remapped values), plus two new tokens `--brand-accent` and `--brand-badge`, and their Tailwind utility mappings `--color-brand-accent` / `--color-brand-badge`. All later tasks style with Tailwind classes like `bg-primary`, `text-brand-accent`, `bg-brand-badge`, `border-border` that depend on these.

- [ ] **Step 1: Replace the `:root` block**

Replace lines 7-40 of `src/app/globals.css` (the existing `:root { ... }` block) with:

```css
:root {
  --radius: 0.625rem;
  --background: #F1F7F2;
  --foreground: #1B2A21;
  --card: #FFFFFF;
  --card-foreground: #1B2A21;
  --popover: #FFFFFF;
  --popover-foreground: #1B2A21;
  --primary: #1B2A21;
  --primary-foreground: #FFFFFF;
  --secondary: #DCEBDF;
  --secondary-foreground: #1B2A21;
  --muted: #DCEBDF;
  --muted-foreground: #8FA294;
  --accent: #DCEBDF;
  --accent-foreground: #1B2A21;
  --destructive: oklch(0.577 0.245 27.325);
  --border: #DCEBDF;
  --input: #DCEBDF;
  --ring: #2F9161;
  --brand-accent: #2F9161;
  --brand-badge: #D9A93C;
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

- [ ] **Step 2: Replace the `.dark` block**

Replace lines 42-74 of `src/app/globals.css` (the existing `.dark { ... }` block) with:

```css
.dark {
  --background: #12201A;
  --foreground: #F1F7F2;
  --card: #1B2A21;
  --card-foreground: #F1F7F2;
  --popover: #1B2A21;
  --popover-foreground: #F1F7F2;
  --primary: #F1F7F2;
  --primary-foreground: #1B2A21;
  --secondary: #1E3A2A;
  --secondary-foreground: #F1F7F2;
  --muted: #1E3A2A;
  --muted-foreground: #7FA08A;
  --accent: #1E3A2A;
  --accent-foreground: #F1F7F2;
  --destructive: oklch(0.704 0.191 22.216);
  --border: rgba(241, 247, 242, 0.12);
  --input: rgba(241, 247, 242, 0.15);
  --ring: #4CB37E;
  --brand-accent: #4CB37E;
  --brand-badge: #D9A93C;
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

- [ ] **Step 3: Add the two new tokens to the `@theme inline` block**

In `src/app/globals.css`, find the `@theme inline { ... }` block (starts around what is now line ~76 after the edits above) and add these two lines right after `--color-ring: var(--ring);`:

```css
  --color-brand-accent: var(--brand-accent);
  --color-brand-badge: var(--brand-badge);
```

- [ ] **Step 4: Verify the file is valid and the app still builds**

Run: `npx tsc --noEmit`
Expected: no output (no type errors) — this file is CSS, so this just confirms the edit didn't break anything else in the repo.

Run: `npm run dev` (in background), then open `http://localhost:3000` in a browser.
Expected: page loads without a Tailwind/PostCSS build error in the terminal. Colors will look different from before (that's expected — buttons/cards now use the new palette). Toggle dark mode via the existing menu and confirm the dark palette also applies without errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "Replace app-wide color tokens with new tracky.fun palette"
```

---

### Task 2: App-wide fonts

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css` (the `@layer base` block at the end)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: CSS variables `--font-baloo` and `--font-nunito` available on `<body>` (and thus everywhere), plus global CSS rules applying Nunito to `body` and Baloo 2 to `h1`–`h6`. No other task directly imports from this one — it's a global style change.

- [ ] **Step 1: Load the fonts in `layout.tsx`**

Read the current `src/app/layout.tsx` — it has this structure:

```tsx
import type { Metadata } from "next";
import { Providers } from "../../providers/providers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: { template: "%s | Würfelkarte", default: "Würfelkarte" },
  description:
    "Würfelkarte – Das digitale Würfel-Erlebnis. Spiele verschiedene Würfelspiel-Varianten, tracke Punkte und genieße spannende Runden mit Freunden!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ overflow: "hidden", width: "100%" }}
      className="h-full"
    >
      <body
        style={{
          height: "100%",
          width: "100%",
          position: "fixed",
          overflowY: "scroll",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Providers>
          {children}
          <SpeedInsights />
          <Analytics />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

Replace it entirely with:

```tsx
import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { Providers } from "../../providers/providers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const baloo2 = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: { template: "%s | Würfelkarte", default: "Würfelkarte" },
  description:
    "Würfelkarte – Das digitale Würfel-Erlebnis. Spiele verschiedene Würfelspiel-Varianten, tracke Punkte und genieße spannende Runden mit Freunden!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ overflow: "hidden", width: "100%" }}
      className={`h-full ${baloo2.variable} ${nunito.variable}`}
    >
      <body
        style={{
          height: "100%",
          width: "100%",
          position: "fixed",
          overflowY: "scroll",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Providers>
          {children}
          <SpeedInsights />
          <Analytics />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Apply the fonts globally in `globals.css`**

In `src/app/globals.css`, find the `@layer base { ... }` block at the end of the file:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

Replace it with:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-nunito), sans-serif;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-baloo), sans-serif;
    font-weight: 700;
  }
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run dev` (in background) and open `http://localhost:3000`.
Expected: headings (e.g. the "Würfelkarte" title in the current header) render in the rounded Baloo 2 typeface; body text renders in Nunito. No console errors about missing fonts.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "Load Baloo 2 and Nunito app-wide as the new typography system"
```

---

### Task 3: Games data, GameTile, and DarkModeToggle components

**Files:**
- Create: `src/components/games/games.ts`
- Create: `src/components/games/GameTile.tsx`
- Create: `src/components/DarkModeToggle.tsx`

**Interfaces:**
- Consumes: `--brand-badge` / `border-border` / `bg-primary` etc. Tailwind classes from Task 1; `useTheme` from `next-themes` (already a project dependency, used elsewhere e.g. `src/components/ModeToggle.tsx`).
- Produces:
  - `GameEntry` type and `games: GameEntry[]` array from `src/components/games/games.ts`, shape `{ key: string; name: string; emoji: string; href?: string; locked: boolean }`.
  - `GameTile` component: `function GameTile({ game }: { game: GameEntry }): JSX.Element`, default export not used — named export `GameTile`.
  - `DarkModeToggle` component: `function DarkModeToggle(): JSX.Element`, named export, no props.
  - Task 4 (mainpage) imports all three.

- [ ] **Step 1: Create the games data file**

Create `src/components/games/games.ts`:

```ts
export type GameEntry = {
  key: string;
  name: string;
  emoji: string;
  href?: string;
  locked: boolean;
};

export const games: GameEntry[] = [
  { key: "yatzy", name: "Yatzy", emoji: "🎲", href: "/yatzy", locked: false },
  { key: "wizard", name: "Wizard", emoji: "🧙‍♂️", locked: true },
  { key: "cabo", name: "Cabo", emoji: "🃏", locked: true },
  { key: "skullking", name: "Skull King", emoji: "💀", locked: true },
];
```

- [ ] **Step 2: Create the `GameTile` component**

Create `src/components/games/GameTile.tsx`:

```tsx
import Link from "next/link";
import type { GameEntry } from "./games";

export function GameTile({ game }: { game: GameEntry }) {
  if (game.locked) {
    return (
      <div
        aria-disabled="true"
        className="flex h-[150px] w-full flex-col justify-between rounded-[20px] border-2 border-border bg-card p-5"
      >
        <span className="text-4xl opacity-50">{game.emoji}</span>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">{game.name}</h2>
          <span className="rounded-full bg-brand-badge px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.03em] text-white">
            Bald
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={game.href ?? "#"}
      className="flex h-[150px] w-full flex-col justify-between rounded-[20px] bg-primary p-5 text-primary-foreground"
    >
      <span className="text-4xl">{game.emoji}</span>
      <h2 className="text-base font-bold">{game.name}</h2>
    </Link>
  );
}
```

- [ ] **Step 3: Create the `DarkModeToggle` component**

Create `src/components/DarkModeToggle.tsx`:

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output — no type errors (these files aren't imported anywhere yet, but `tsc` still checks unreferenced files that are inside `include` paths in `tsconfig.json`).

Run: `npm run lint`
Expected: no errors for the three new files.

- [ ] **Step 5: Commit**

```bash
git add src/components/games/games.ts src/components/games/GameTile.tsx src/components/DarkModeToggle.tsx
git commit -m "Add games catalog data and GameTile/DarkModeToggle components"
```

---

### Task 4: New mainpage

**Files:**
- Modify: `src/app/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `games` from `@/components/games/games`, `GameTile` from `@/components/games/GameTile`, `DarkModeToggle` from `@/components/DarkModeToggle` (Task 3); `Button` from `@/components/ui/button`; `UserRound` icon from `lucide-react`; `useRouter` from `next/navigation`; `process.env.NEXT_PUBLIC_PROFILE_ACTIVE`.
- Produces: default export `GamesOverview`, the new `/` route. Nothing else in the app imports from `page.tsx`.

- [ ] **Step 1: Replace `src/app/page.tsx`**

Replace the entire contents of `src/app/page.tsx` with:

```tsx
"use client";

import { DarkModeToggle } from "@/components/DarkModeToggle";
import { games } from "@/components/games/games";
import { GameTile } from "@/components/games/GameTile";
import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

const PROFILE_ACTIVE = process.env.NEXT_PUBLIC_PROFILE_ACTIVE === "true";

export default function GamesOverview() {
  const router = useRouter();

  return (
    <div className="min-h-full bg-background px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="flex items-center justify-between">
          <span className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-baloo)" }}>
            <span className="text-foreground">tracky</span>
            <span className="text-brand-accent">.fun</span>
          </span>
          <div className="flex items-center gap-3">
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
          </div>
        </header>

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

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

Run: `npm run dev` (in background) and open `http://localhost:3000`.
Expected:
- Header shows "tracky" in ink + ".fun" in green, Baloo 2 font, with a dark-mode toggle circle on the right (and a profile icon too if `NEXT_PUBLIC_PROFILE_ACTIVE=true` is set in `.env`).
- A 2-column grid with 4 tiles: "Yatzy" (dark filled tile, 🎲) and "Wizard" / "Cabo" / "Skull King" (white tiles, 50%-opacity emoji, "Bald" pill badge).
- Clicking the Yatzy tile currently 404s (expected — `/yatzy` doesn't exist until Task 5). Clicking a locked tile does nothing.
- Clicking the dark-mode toggle switches the whole page between light/dark palettes.
- No multiplayer banner, highscores table, "Freies Tracking" card, or "Idee vorschlagen" card is present.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Rewrite mainpage as a games catalog grid"
```

---

### Task 5: Move Yatzy variant selection to `/yatzy`

**Files:**
- Create: `src/app/yatzy/page.tsx`

**Interfaces:**
- Consumes: `gamemodes` from `@/components/gamemodes/gamemodes` (existing, unchanged); `Menu` from `@/components/Menu` (existing, unchanged); `Card`/`Button` from `@/components/ui/*`; `ArrowLeft`, `Dices`, `UserRound` from `lucide-react`; `next/image`, `next/link`, `next/navigation`.
- Produces: default export, the new `/yatzy` route. Links from the mainpage's `GameTile` (Task 3/4, `href: "/yatzy"`) now resolve.

- [ ] **Step 1: Create `src/app/yatzy/page.tsx`**

```tsx
"use client";

import { gamemodes } from "@/components/gamemodes/gamemodes";
import { Menu } from "@/components/Menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Dices, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PROFILE_ACTIVE = process.env.NEXT_PUBLIC_PROFILE_ACTIVE === "true";

export default function YatzyGamemodeSelect() {
  const router = useRouter();
  const [purchased, setPurchased] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const bought = localStorage.getItem("purchasedGamemodes");
      setPurchased(bought ? JSON.parse(bought) : ["Klassiker"]);
    }
  }, []);

  const handlePlay = (key: string, price: number) => {
    if (
      price === 0 ||
      purchased.includes(key.toLowerCase().replace(/[^a-z0-9]/g, ""))
    ) {
      router.push(`/${key.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
    } else {
      router.push(`/checkout/${key.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
    }
  };

  return (
    <>
      <div className="w-full sticky dark:bg-[#0a0a0a] bg-white h-25 right-0 top-0">
        <Card className="mx-4 p-4 flex flex-row justify-between items-center sticky top-4 z-30">
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
          <div className="flex flex-row gap-4">
            {PROFILE_ACTIVE && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/profile")}
                aria-label="Profil"
              >
                <UserRound />
              </Button>
            )}
            <Menu />
          </div>
        </Card>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mb-4 px-4">
        {Object.entries(gamemodes).map(([key, mode]) => {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const isUnlocked =
            mode.price === 0 || purchased.includes(normalizedKey);
          return (
            <div key={key} className="w-full sm:w-64">
              <Card className="h-64 w-full p-6 flex flex-col items-center justify-between">
                <h2 className="text-xl font-bold mb-2">{mode.name}</h2>
                <div className="text-gray-500 text-sm mb-2 flex-1 flex items-center justify-center text-center">
                  {mode.description}
                </div>
                <Button
                  variant={isUnlocked ? "outline" : "default"}
                  className="w-full"
                  onClick={() => handlePlay(key, mode.price ?? 0)}
                  disabled={false}
                >
                  <Dices size={20} className="mr-2" />
                  {isUnlocked
                    ? "Spielen"
                    : `${mode.price?.toFixed(2) ?? ""} € freischalten`}
                </Button>
              </Card>
            </div>
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

Run: `npm run dev` (in background) and:
1. Open `http://localhost:3000`, click the Yatzy tile — confirm it navigates to `/yatzy`.
2. On `/yatzy`, confirm the 5 variant cards (Wunder, Wunder+, Chaoswunder, Mini Wunder, Super Wunder) render with their descriptions, and clicking "Spielen" on "Wunder" navigates to `/wunder` and starts the existing game flow.
3. Click the back arrow / logo in the `/yatzy` header — confirm it returns to `/`.

- [ ] **Step 3: Commit**

```bash
git add src/app/yatzy/page.tsx
git commit -m "Add /yatzy route with the Yatzy variant selector moved from the mainpage"
```

---

## Final check (not a task — run after Task 5)

- [ ] Run `npx tsc --noEmit && npm run lint` once more from repo root; both must be clean.
- [ ] Run `npm run build` to confirm the production build succeeds with the new routes and font loader.
