# Mainpage Games Overview Redesign

## Context

The mainpage (`src/app/page.tsx`) currently lists the 5 Yatzy rule variants (Wunder, Wunder+, Chaoswunder, Mini Wunder, Super Wunder) directly as top-level cards, alongside a multiplayer banner, a highscores table, a "Freies Tracking" card, and a feature-request card.

The app is growing beyond Yatzy (Wizard, Cabo, Skull King are planned). The mainpage should become a catalog of *games*, each of which may later drill into its own variant/mode selection — starting with Yatzy.

A visual reference mockup (provided by the user) specifies a new design language: fonts, colors, shapes, and component treatment (see "Visual system" below).

## Goals

- Mainpage shows a clean grid of games: Yatzy (playable), Wizard, Cabo, Skull King (coming soon).
- Today's Yatzy-variant-selection experience moves to a new `/yatzy` route, unchanged in behavior.
- Adopt the new visual system (fonts, colors) app-wide, and the new component treatment (pill buttons, tile shapes) on the mainpage.
- No multiplayer banner, highscores, or feature-request card on the mainpage.

## Non-goals

- Restyling `/yatzy`, `/[gamemode]`, `/checkout`, `/profile`, `/multiplayer`, `/freiestracking` beyond what they automatically inherit from the app-wide color/font token change.
- Building real Wizard/Cabo/Skull King games — their tiles are inert placeholders.
- Changing document `<title>`, PWA name/manifest, or favicon.
- Re-adding highscores/feature-request UI anywhere (fully removed, not relocated).

## Route structure

- `src/app/page.tsx` — rewritten. New games-overview grid only.
- `src/app/yatzy/page.tsx` — new route. Receives today's `page.tsx` body content: header, the 5 variant cards (`gamemodes` from `src/components/gamemodes/gamemodes.ts`), and the existing purchase/checkout routing logic (`handlePlay`, `purchased` state from `localStorage`). Visual style is carried over as-is (existing shadcn `Card`/`Button` components, existing header pattern) — not restyled to the new mockup in this task. Gets a back-link to `/` and title "Yatzy" in place of "Würfelkarte".
- Highscores card and "Idee vorschlagen" (feature request/email) card: deleted, not relocated.
- "Freies Tracking" card: removed from the mainpage grid. The `/freiestracking` route and its page are untouched — just no longer linked from anywhere in the UI as part of this task.
- `/multiplayer` route untouched; only the banner promoting it on the mainpage is removed.

## Mainpage header

- Left: wordmark — "tracky" in ink color (Baloo 2, weight 800) + ".fun" in brand accent green (Baloo 2, weight 800), replacing the "Würfelkarte" text + dice-icon lockup.
- Right: a circular dark-mode toggle button (solid ink background, white sun/moon icon via `lucide-react`, single click toggles between `light`/`dark` via `next-themes`'s `useTheme` — simpler than the existing 3-way light/dark/system dropdown in `ModeToggle.tsx`/`Menu.tsx`). If `NEXT_PUBLIC_PROFILE_ACTIVE === "true"`, a profile icon button (existing behavior, routes to `/profile`) sits alongside it.
- The "..." options `Menu` component is not rendered on this page (nothing to manage: no players, no rules, no reset).

## Games grid

New file `src/components/games/games.ts`:

```ts
export type GameEntry = {
  key: string;
  name: string;
  emoji: string;
  href?: string; // present only when unlocked
  locked: boolean;
};

export const games: GameEntry[] = [
  { key: "yatzy", name: "Yatzy", emoji: "🎲", href: "/yatzy", locked: false },
  { key: "wizard", name: "Wizard", emoji: "🧙‍♂️", locked: true },
  { key: "cabo", name: "Cabo", emoji: "🃏", locked: true },
  { key: "skullking", name: "Skull King", emoji: "💀", locked: true },
];
```

Rendered as a 2-column grid (`grid grid-cols-2 gap-4`) of tiles, `20px` border radius:

- **Unlocked tile** (Yatzy): solid ink (`--foreground`/ink token) background, white text, large emoji, game name in Baloo 2 bold. Wrapped in a `Link` to `href`.
- **Locked tile** (Wizard, Cabo, Skull King): white background, `2px` accent-tint (`#DCEBDF`-equivalent token) border, emoji at 50% opacity, game name in ink, amber "BALD" pill badge. Rendered as a plain `div` — no `onClick`, no `Link`, `aria-disabled="true"`.

Adding a 5th game later means adding one entry to `games.ts`.

## Visual system (app-wide)

### Fonts

- Baloo 2 (600/700/800) and Nunito (400/600/700/800/900) loaded via `next/font/google` in `src/app/layout.tsx`, exposed as CSS variables (`--font-baloo`, `--font-nunito`).
- `globals.css`: `body` uses `var(--font-nunito)`; `h1`–`h6` use `var(--font-baloo)` with a bold default weight. This replaces the current default sans app-wide.

### Colors

`globals.css` `:root` (light) and `.dark` shadcn tokens are remapped to the new palette:

| Token | Light | Dark |
|---|---|---|
| `--background` | `#F1F7F2` | `#12201A` |
| `--foreground` | `#1B2A21` | `#F1F7F2` |
| `--card` / `--popover` | `#FFFFFF` | `#1B2A21` |
| `--card-foreground` / `--popover-foreground` | `#1B2A21` | `#F1F7F2` |
| `--primary` | `#1B2A21` | `#F1F7F2` |
| `--primary-foreground` | `#FFFFFF` | `#1B2A21` |
| `--secondary` / `--muted` / `--accent` | `#DCEBDF` | `#1E3A2A` (extrapolated) |
| `--secondary-foreground` / `--accent-foreground` | `#1B2A21` | `#F1F7F2` |
| `--muted-foreground` | `#8FA294` | `#7FA08A` |
| `--border` / `--input` | `#DCEBDF` | `rgba(241,247,242,.12)` (extrapolated) |
| `--ring` | `#2F9161` | `#4CB37E` |

Two new tokens (not part of shadcn's default set) for roles the mockup calls out that don't map to an existing slot:

| Token | Light | Dark |
|---|---|---|
| `--brand-accent` | `#2F9161` | `#4CB37E` |
| `--brand-badge` | `#D9A93C` | `#D9A93C` (used sparingly, same both modes) |

`--destructive` and chart tokens are left unchanged (out of scope, not specified by the mockup).

`--radius` is left unchanged (`0.625rem`) to avoid resizing existing components on unrestyled pages. The mainpage's own tiles/pills use explicit Tailwind radius utilities (`rounded-full`, `rounded-[20px]`) rather than the shared token.

### Blast radius acknowledgment

Because colors and fonts change at the token/base level, every existing page (game boards, checkout, profile, multiplayer) will visually shift to the new palette and typography automatically, even though only the mainpage and `/yatzy`'s header/title are being hand-edited. Bespoke component-level color logic (e.g. custom score-highlight colors in `Scoring.tsx`) is not audited or adjusted in this task — only the shared CSS variables change. Any resulting visual rough edges on other pages are follow-up work, not part of this task.

## Testing

- Manual verification: mainpage renders the 4-tile grid correctly in light and dark mode; Yatzy tile navigates to `/yatzy`; locked tiles are inert; `/yatzy` renders the 5 variant cards and existing purchase flow still works; dark-mode toggle works from the new header button.
- No automated test suite exists in this repo currently (no test runner in `package.json`) — verification is manual/visual per the `run` skill.
