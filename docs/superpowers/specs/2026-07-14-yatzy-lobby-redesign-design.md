# Yatzy Lobby Redesign

## Context

`src/app/yatzy/page.tsx` currently renders today's original mainpage content moved verbatim: a grid of 5 gamemode cards (`gamemodes` from `src/components/gamemodes/gamemodes.ts`) with a "Spielen"/"X € freischalten" button per card, plus a header with back-link, dice icon, "Yatzy" title, profile button, and the `Menu` dropdown.

A new mockup (provided by the user) specifies a different lobby experience for this page: a persistent player roster with emoji avatars, a gamemode picker as pills, a single "Spiel starten" action, and a "Letzte Spiele" (recent games) list. This is a real feature addition — player roster management currently only exists inline during play on `/[gamemode]`, and emoji avatars don't exist anywhere in the codebase yet.

## Goals

- `/yatzy` becomes a pre-game lobby: pick who's playing, pick a mode, start.
- Players are represented as chips with an emoji + name, toggle-selectable, addable via a `+` tile and a "Neuer Spieler" dialog (name + emoji picker).
- All 5 existing gamemodes remain reachable, as pill buttons.
- A "Letzte Spiele" section surfaces recent match history using data that already exists in `localStorage`.
- Visual language matches the mockup: dark filled pills/buttons for primary actions and active selections, using existing `bg-primary`/`text-primary-foreground` tokens.

## Non-goals

- No changes to `/[gamemode]/page.tsx`, `useKniffel`, the `Player` type, or `PlayerCard` — emoji avatars are a lobby-only concept and do not appear during actual scoring.
- No stats/chart icon and no `Menu`/profile button on this page — header right side is empty, matching the mockup exactly.
- No paid/locked-mode UI. All 5 gamemodes currently have `price: 0`; the checkout route/logic elsewhere is untouched but unused from this page.
- No migration of the legacy `kniffel:player-names` (name-only) localStorage data into the new roster — this is a fresh start for player data on this page.
- No changes to how `lastMatches` is written (`Scoring.tsx` keeps writing `{ players, gamemode, timestamp }` as-is); no per-player emoji is added to match history.

## Data model & storage

New roster concept, independent of the in-game `Player` type:

```ts
type RosterPlayer = {
  id: string;
  name: string;
  emoji: string;   // one of the fixed 8-emoji set
  active: boolean; // selected to play the next game
};
```

- New localStorage key `kniffel:roster` holds `RosterPlayer[]`.
- Fixed emoji set (exactly 8, matching the mockup): 🦄 🔥 😎 🐸 🐼 🦊 🐧 ⚡.
- New hook `usePlayerRoster()` (in `src/components/hooks/usePlayerRoster.ts`), shaped like `useKniffel`:
  - `roster: RosterPlayer[]`
  - `addPlayer(name: string, emoji: string): void` — new player starts `active: true`.
  - `toggleActive(id: string): void`
  - `renamePlayer(id: string, name: string): void`
  - `changeEmoji(id: string, emoji: string): void`
  - `removePlayer(id: string): void`
  - Persists to `kniffel:roster` on every change, loads from it on mount (empty array if none stored).

### Bridging roster → gameplay

`[gamemode]/page.tsx` and `useKniffel` are unmodified and still read player names from the existing `kniffel:player-names` key. When "Spiel starten" is pressed:

1. Filter `roster` to `active` players.
2. Write their `name`s (in chip order) to `kniffel:player-names` (same format `useKniffel` already writes: `string[]`).
3. `router.push(`/${normalizedGamemodeKey}`)`.

This keeps the gameplay page's existing behavior (including its zero-points-on-load semantics) completely intact, at the cost of emoji not being available there.

## Components

All new components live under `src/components/yatzy-lobby/` (or alongside existing ones under `src/components/` — match whichever convention feels least disruptive at implementation time; not load-bearing for this spec).

- **`PlayerChip`** — pill: emoji + name. `active: true` → `bg-primary text-primary-foreground` (filled, matches mockup). `active: false` → outline/`bg-card border-border`. Tap toggles `active` via `toggleActive`. Press-and-hold (~500ms, works for touch and mouse) opens a small dropdown menu — Rename / Emoji ändern / Entfernen — following the existing `EditPlayer.tsx` dropdown pattern.
- **`AddPlayerChip`** — trailing `+` tile, same pill footprint, muted/accent background (`bg-accent`), opens `AddPlayerDialog` on click.
- **`AddPlayerDialog`** (new; not a reuse of `AddPlayer.tsx`, which is wired to `useKniffel`'s string-only `addPlayer`) — `Dialog` with: name `Input`, 4×2 emoji grid (single-select highlight, defaults to first emoji), "Hinzufügen" button (disabled until name is non-empty), calls `usePlayerRoster().addPlayer`.
- **`GamemodePillSelector`** — one pill per entry in `gamemodes` (`Wunder`, `Wunder+`, `Chaoswunder`, `Mini Wunder`, `Super Wunder`), wraps onto additional rows as needed. Single-select (local `useState<string>`, defaulting to the first key, `"Wunder"`). Selected pill: `bg-brand-accent text-white` (green, visually distinct from the black player chips). Unselected: `bg-card border-border`.
- **`RecentMatchesList`** — reads `localStorage["lastMatches"]`, parses, sorts by `timestamp` descending, takes the 5 most recent. Each row renders: gamemode display name + short date (`d.M.`, e.g. `11.7.`), comma-joined player names, and 🏆 + the highest-`score` player's name + score. Empty state (no matches yet): section is omitted entirely (no "Letzte Spiele" heading with nothing under it).

## Page composition (`src/app/yatzy/page.tsx`)

Top to bottom:

1. Header (unchanged from today except title/back-link already correct): back arrow → `/`, dice icon, "Yatzy" title. Right side of header is now empty — `Menu` and the `PROFILE_ACTIVE` profile button are removed from this page.
2. `SPIELER` label + row of `PlayerChip`s (from `usePlayerRoster().roster`) + trailing `AddPlayerChip`. Wraps on narrow viewports.
3. `SPIELMODUS` label + `GamemodePillSelector`.
4. `Spiel starten 🎲` full-width button, `bg-primary text-primary-foreground`. Disabled when zero roster players are `active`. `onClick` performs the roster→`kniffel:player-names` bridge and navigates.
5. `LETZTE SPIELE` label + `RecentMatchesList` (omitted entirely if there's no match history yet).

## Testing

- No automated test runner exists in this repo (per the earlier mainpage spec) — verification is manual/visual via the `run` skill.
- Manual check: add a player (name + emoji), confirm chip renders filled/active; toggle it off and on; press-and-hold to rename/change emoji/remove; confirm roster persists across a page reload (`kniffel:roster` in localStorage).
- Manual check: select each of the 5 gamemode pills, confirm single-select behavior and default selection on load.
- Manual check: with ≥1 active player, "Spiel starten" navigates to the correct `/${gamemode}` route and that page's player list matches the active roster names with zero starting points; with 0 active players, the button is disabled.
- Manual check: play a full game to completion (writes to `lastMatches` via `Scoring.tsx`), return to `/yatzy`, confirm it appears at the top of "Letzte Spiele" with correct mode/date/players/winner/score. Confirm the section is absent on a fresh browser profile with no match history.
- Manual check: light and dark mode for chip/pill/button color states.
