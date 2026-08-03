# Game Architecture Refactor Implementation Plan

> Design: [2026-08-03-game-architecture-refactor-design](../specs/2026-08-03-game-architecture-refactor-design.md)

**Goal:** Restructure the repo around `src/games/<game>/` feature folders plus a shared game kit, so that adding a game means writing a config, a scoring module and one board component — with every duplicated component collapsed to one, naming made consistent, storage keys unified behind a migration, seasonal themes made app-wide, and Yatzy fully migrated without losing any of its features.

**Architecture:** Bottom-up. Tests first (they define "unchanged behaviour"), then the shared kit, then the games in ascending order of risk — Flip 7 (newest, smallest), Wizard (same shape, more features), Yatzy (legacy outlier). The shared UI is extracted only once two games are in place, so the abstraction is derived from real cases rather than guessed. Every task ends green: `tsc`, `lint`, `vitest`, and — from task 3 on — `build`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind 4, shadcn/ui, localStorage only. Test runner added in task 1 (Vitest, node environment, no DOM testing).

**Branch:** `refactor/game-architecture`, one commit per task.

## Global Constraints

- **Nothing is removed from Yatzy.** Battle mode, Chaoswunder missions + settings, seasonal themes, confetti, point grid, `X` cross-out, player reordering, mission progress dots, horizontal scroll-to-next-player all survive.
- **No behaviour change in a move commit.** Moving files and changing behaviour never happen in the same step; the drift resolutions from the spec land in task 6, explicitly.
- **No user data loss.** New storage keys are written only when absent; legacy keys are left in place.
- **The test suite must be green at the end of every task**, with only import paths edited — a test whose expectations change means the refactor changed behaviour.
- German UI strings and English identifiers stay as they are.
- Per-game components drop the game prefix (`WizardMenu` → `games/wizard/components/Menu.tsx`).
- No file under `src/games/**` or `src/components/**` may import from `@/app/**`.

---

### Task 1: Add Vitest and characterize the existing pure logic

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (devDeps `vitest`, script `test`)
- Create: `src/components/gamemodes/__tests__/scoring.test.ts` (Yatzy `calculateScore` via `useKniffel`'s export, all six gamemodes)
- Create: `src/components/gamemodes/__tests__/battle.test.ts`
- Create: `src/components/wizard/__tests__/scoring.test.ts`
- Create: `src/components/flip7/__tests__/scoring.test.ts`
- Create: `src/components/__tests__/share.test.ts` (share text for all three games)
- Create: `src/components/__tests__/legacy-storage.fixtures.ts` (captured real-shape payloads for every legacy key)

**Interfaces:** none — tests only, written against current import paths.

- [ ] **Step 1: Install Vitest and wire the config**

```bash
npm install -D vitest
```

`vitest.config.ts` with `test.environment: "node"`, `resolve.alias` mapping `@` → `./src`. Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` scripts.

- [ ] **Step 2: Characterize Yatzy scoring**

Cover `calculateScore` for `Wunder`, `WunderPlus`, `MiniWunder`, `SuperWunder`, `Chaoswunder`, `Battle`: bonus exactly at `minSum`, one below, `X` fields ignored, empty sheet, full sheet.

- [ ] **Step 3: Characterize Battle mode**

`battleTotalScore` with and without doubled fields, `getBattleFieldStatus` for open/claimed/crossed, `isForcedSuccess` for the case that flips a field to doubled.

- [ ] **Step 4: Characterize Wizard scoring**

`playerRoundScore` (exact bid, over, under), `effectiveBid` with Wolke ±1, `bombTrick`, `totalScore`, `standings`, `deckSize` per special-card count, `suggestedRounds` for 3–6 players, `isGameFinished`, `firstOpenRound`, `allBidsEntered`, and `null` (not-entered) vs `0`.

- [ ] **Step 5: Characterize Flip 7 scoring**

`playerRoundScore` (plain, busted, Flip 7 bonus, absent), `totalScore`, `standings`, `createRound`, `minTargetScore`, `isTiedAtTop`, `firstOpenRound`.

- [ ] **Step 6: Characterize the share text**

Snapshot `buildShareText` output for each game with 2, 6 and 10 players including ties — this pins the current medal/rank behaviour before it is unified in task 6.

- [ ] **Step 7: Capture legacy storage fixtures**

Read the real shapes out of the current code and record one payload per legacy key (`lastMatches` with whole `Player` objects, `kniffel:player-names` in both string and object form, `kniffel:roster` with and without `selectionOrder`, `chaoswunderSettings`, `wizard:lastMatches`, `flip7:lastMatches`, `wizard:game`, `flip7:game`). No assertions yet — task 2 tests the migration against these.

- [ ] **Step 8: Verify and commit**

Run: `npm test` → all green. `npx tsc --noEmit`, `npm run lint`.

```bash
git add -A && git commit -m "Add Vitest and characterization tests for game logic"
```

---

### Task 2: Create the shared game kit and the storage migration

**Files:**
- Create: `src/games/shared/types.ts`, `config.ts`, `storage.ts`, `migrations.ts`
- Create: `src/games/shared/hooks/{usePlayerRoster,useMatchHistory,useHideScores}.ts`
- Create: `src/games/registry.ts`
- Create: `src/games/shared/__tests__/{storage,migrations}.test.ts`
- Modify: `src/app/layout.tsx` (run migrations once on boot)

**Interfaces:**

```ts
// games/shared/types.ts
export type RosterPlayer = { id: string; name: string; emoji: string; active: boolean; selectionOrder: number | null };
export type ScoredPlayer = { id: string; name: string; emoji?: string; score: number };
export type MatchPlayer = { name: string; emoji?: string; score: number };
export type StoredMatch<TExtra = unknown> = { id: string; players: (MatchPlayer & TExtra)[]; gamemode: string; timestamp: string; durationMs?: number };

// games/shared/storage.ts
export function createGameStorage<TGame, TMatch extends { id: string }, TSettings>(namespace: string): {
  loadGame(): TGame | null; saveGame(g: TGame): void; clearGame(): void;
  loadMatches(): TMatch[]; saveMatch(m: TMatch): void; removeMatch(id: string): void;   // saveMatch upserts by id
  loadSettings(): TSettings; saveSettings(patch: Partial<TSettings>): void;
};

// games/shared/config.ts — GameDefinition as specified in the design doc
```

- [ ] **Step 1: Write the shared types and the storage factory**

`createGameStorage` generalizes the identical bodies of `wizard/storage.ts` and `flip7/storage.ts`, taking upsert-by-id as the match behaviour (Flip 7's).

- [ ] **Step 2: Write `migrations.ts`**

One `migrateLegacyStorage()` guarded by `wuerfelkarte:schema === "1"`: for each mapping in the design doc's table, if the new key is absent and the old key exists, transform and write. `lastMatches` entries get an `id` (`crypto.randomUUID()`) and are reduced from whole `Player` objects to `{ name, emoji, score }`. Old keys are not deleted.

- [ ] **Step 3: Test the migration against the task 1 fixtures**

One test per legacy key: migrates correctly, is idempotent (second run is a no-op), does not overwrite an existing new key, and survives malformed JSON without throwing.

- [ ] **Step 4: Write `registry.ts`**

Replaces `src/components/games/games.ts`: all eight entries (three playable, five locked) with key, name, emoji, href, locked, alternativeNames. Playable entries later reference their `GameDefinition`.

- [ ] **Step 5: Run the migration at boot**

A tiny client component rendered in `src/app/layout.tsx` calls `migrateLegacyStorage()` in a mount effect, before any game code reads storage.

- [ ] **Step 6: Verify and commit**

`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

```bash
git add -A && git commit -m "Add shared game kit and legacy storage migration"
```

---

### Task 3: Move Flip 7 into src/games/flip7

**Files:**
- Create: `src/games/flip7/{config,types,scoring,storage}.ts`, `gamemodes.ts`
- Create: `src/games/flip7/hooks/useGame.ts`
- Create: `src/games/flip7/components/{Board,RoundCard,ScoreKeypad,Menu,ManagePlayersDialog,HistoryTable,TargetScoreDialog,TargetScoreStepper,TargetReachedDialog,ScoreDialog}.tsx`
- Modify: `src/app/flip7/page.tsx`, `src/app/flip7/[gamemode]/page.tsx` → thin wrappers
- Delete: `src/components/flip7/**`
- Modify: `src/components/flip7/__tests__/*` → `src/games/flip7/__tests__/*` (import paths only)

**Interfaces:** `flip7Gamemodes` → `gamemodes`, `useFlip7` → `useGame`, `Flip7Menu` → `Menu`, storage functions replaced by `flip7Storage` from `createGameStorage("flip7")`; type names keep their `Flip7` prefix (`Flip7Game`, `Flip7Round`) since they cross module boundaries.

- [ ] **Step 1: Move logic modules** (`types`, `scoring`, `gamemodes`), imports updated, no body changes.
- [ ] **Step 2: Replace `storage.ts` with `createGameStorage("flip7")`**, keeping the `createRound` backfill and the target-score setting as a typed settings blob. Keys become `flip7:matches` (migrated in task 2).
- [ ] **Step 3: Move the hook and components**, dropping the `Flip7` prefix from file and component names.
- [ ] **Step 4: Reduce the route files** to `export { default } from "@/games/flip7/…"`-style wrappers holding no logic.
- [ ] **Step 5: Move the tests**, changing import paths only. `npm test` must pass unchanged.
- [ ] **Step 6: Verify and commit** — `npm test`, `tsc`, `lint`, `build`, plus a click-through of a full Flip 7 game (bust, Flip 7 bonus, target reached, resume, share).

```bash
git add -A && git commit -m "Move Flip 7 into src/games/flip7"
```

---

### Task 4: Move Wizard into src/games/wizard

**Files:** mirror of task 3 for Wizard, plus `specialCards.ts` and `components/{RoundsDialog,SpecialCardSelector,NumberSelect}.tsx`.

- [ ] **Step 1–5:** same sequence as task 3 (logic → storage factory → hook + components → thin routes → tests). Wizard's `saveWizardMatch` push becomes upsert-by-id via the factory; `StoredWizardMatch` gains an `id`, and the migration backfills ids for existing entries.
- [ ] **Step 6: Verify and commit** — `npm test`, `tsc`, `lint`, `build`, click-through of a full Wizard game including the 25 Jahre Edition, ±1, Bombe and Wolke.

```bash
git add -A && git commit -m "Move Wizard into src/games/wizard"
```

---

### Task 5: Extract the shared shell from the two round-based games

**Files:**
- Create: `src/games/shared/components/{GameShell,RoundNav,GameMenu,Lobby,GamemodePills,PlayerChip,PlayerIdentityDialog,ManagePlayersDialog,RecentMatches,GamemodeStats,ScoreDialog,ScoreDiagram,ShareResult}.tsx`
- Modify: Wizard and Flip 7 boards/lobbies to consume them
- Delete: the per-game copies now unused; `src/components/yatzy-lobby/**` (its `PlayerChip`, `AddPlayerDialog` and `types` move into the shared kit)

**Interfaces:** `Lobby` takes `{ game: GameDefinition, extras?: ReactNode, onStart(players, options) }`; `GameShell` takes `{ game, title, rounds, viewIndex, onJump, hideScores, menu, children }`; `ShareResult` takes `{ game, players, subtitle }`.

- [ ] **Step 1: Extract `Lobby`** from the two now-parallel lobby pages, with the target-score stepper / special-card selector / round stepper passed through `extras`.
- [ ] **Step 2: Extract `GameShell` + `RoundNav`** from the two `[gamemode]/page.tsx` files (round navigation, hide-scores toggle, empty-state, elapsed time).
- [ ] **Step 3: Extract `GameMenu`** with an entries model, so each game contributes its own dialog entries instead of forking the component.
- [ ] **Step 4: Extract `ManagePlayersDialog`**, with Wizard's "confirm the new round count" step as an optional `onBeforeAdd` hook.
- [ ] **Step 5: Extract `RecentMatches`, `GamemodeStats`, `ScoreDialog`, `ScoreDiagram`, `ShareResult`, `GamemodePills`, `PlayerChip`, `PlayerIdentityDialog`.**
- [ ] **Step 6: Verify and commit** — `npm test` (share snapshots must still match; behaviour changes come in task 6), `tsc`, `lint`, `build`, click-through of both games.

```bash
git add -A && git commit -m "Extract shared lobby, shell and result components"
```

---

### Task 6: Apply the drift resolutions

**Files:** the shared components from task 5; `src/games/*/config.ts`; the share snapshots.

- [ ] **Step 1: Ranks 1–10** in the shared share text (was Yatzy-only). Update the Wizard/Flip 7 snapshots — this is the first intentional expectation change, and it lands in its own commit so the diff is obvious.
- [ ] **Step 2: Derive the score-diagram count-up step** from the score range instead of the hardcoded 1 / 2.
- [ ] **Step 3: Bordered gamemode pills** in both states, everywhere.
- [ ] **Step 4: Upsert-by-id match history** for all games (already true for Wizard/Flip 7 after tasks 3–4; Yatzy follows in task 7).
- [ ] **Step 5: `statColumns` config** so Wizard's ±1 badge and Flip 7's Flip-7/bust counters come from `GameDefinition`, not from component branches.
- [ ] **Step 6: Verify and commit** — `npm test`, `tsc`, `lint`, `build`, visual check of both games' pills, diagram and share PNG.

```bash
git add -A && git commit -m "Unify drift between the merged game components"
```

---

### Task 7: Move Yatzy into src/games/yatzy

**Files:**
- Create: `src/games/yatzy/{config,types,scoring,storage,points}.ts`, `gamemodes/{index,battle,chaoswunder}.ts`
- Create: `src/games/yatzy/hooks/useGame.ts` (was `useKniffel`)
- Create: `src/games/yatzy/components/{Board,PlayerCard,PointGrid,ChaosMissions,ChaosSettingsDialog,Menu,ScoreDialog}.tsx`
- Modify: `src/app/yatzy/page.tsx` → shared `Lobby`; `src/app/yatzy/[gamemode]/page.tsx` → thin wrapper around `Board`
- Move: `public/points.json` → `src/games/yatzy/points.ts`
- Delete: `src/components/{PlayerCard,Scoring,Share,AnimatedScoreDiagram,Menu,AddPlayer,EditPlayer,ResetGame,GamemodeInfo,PlayerIdentityDialog}.tsx`, `src/components/gamemodes/**`, `src/components/hooks/**`, `src/components/games/**`

**Interfaces:** `useKniffel` → `useGame`; `Player.id` becomes a string (`crypto.randomUUID()`) to match the other games — the migration maps existing numeric ids; `calculateScore` moves to `games/yatzy/scoring.ts`.

- [ ] **Step 1: Extract the Chaoswunder mission selection** out of the page into a pure `selectMissions(count, balanced, rng)` in `gamemodes/chaoswunder.ts`, and add tests for the difficulty distribution (1/3/3 and 2/6/6) — this is the untested logic most at risk in the split.
- [ ] **Step 2: Move the logic modules** (`gamemodes`, `battle`, `chaoswunder`, `scoring`, `types`, `points`), imports updated, no body changes. Update the task 1 tests' import paths; they must pass unchanged.
- [ ] **Step 3: Give Yatzy a `storage.ts`** built on `createGameStorage("yatzy")` — matches (upsert by id, replacing the 2-minute debounce), players, and the Chaoswunder settings blob.
- [ ] **Step 4: Split the 587-line page.** `Board.tsx` keeps the player carousel, scroll-to-next-player and the `doubled` set; `ChaosMissions.tsx` takes the mission card, progress dots and settings dialog; the route file keeps only param parsing.
- [ ] **Step 5: Move `PlayerCard` + `PointGrid` + `EditPlayer`** into the Yatzy folder; the confetti and `THEME_EMOJIS` usage stays.
- [ ] **Step 6: Wire Yatzy onto the shared components** — `Lobby`, `GameMenu`, `ScoreDialog`, `ShareResult`, `GamemodeStats` (its adjusted win rate becomes a `statColumn`), `RecentMatches`, `PlayerIdentityDialog`.
- [ ] **Step 7: Verify and commit** — `npm test`, `tsc`, `lint`, `build`, then a deliberate click-through: Wunder / WunderPlus / MiniWunder / SuperWunder scoring and bonus, **Battle** (claim, cross out, forced success doubling, reset), **Chaoswunder** (both settings toggles, mission advance toast, progress dots), add/rename/remove/reorder players mid-game, reset points vs reset all, score dialog, share text + PNG.

```bash
git add -A && git commit -m "Move Yatzy into src/games/yatzy and split its game page"
```

---

### Task 8: Make the seasonal themes app-wide

**Files:**
- Create: `src/components/common/seasonal/{index.ts,useSeasonalTheme.ts,ThemeManager.tsx,ChristmasTheme.tsx,EasterTheme.tsx,HalloweenTheme.tsx}`
- Delete: `src/components/themes/**`, `src/components/hooks/useTheme.ts`
- Modify: the three boards + shared `GameMenu`

**Interfaces:** `export type Theme = "none" | "Halloween" | "Christmas" | "Easter"` now lives in `common/seasonal` (was exported from the Yatzy route module); `useSeasonalTheme()` reads/writes `wuerfelkarte:themeActive`.

- [ ] **Step 1: Move the theme modules** and delete the `@/app/yatzy/[gamemode]/page` type import — the layering violation that motivated this.
- [ ] **Step 2: Replace `HalloweenTheme`'s `gamemode !== "MiniWunder"` check** with a `hideCenterpiece` prop the Yatzy board passes.
- [ ] **Step 3: Render `ThemeManager` behind the Wizard and Flip 7 boards** as it already is behind Yatzy's player cards.
- [ ] **Step 4: Add the theme toggle to the shared `GameMenu`** so all three games show it, gated on an active season, backed by the one app-wide setting.
- [ ] **Step 5: Verify and commit** — `npm test`, `tsc`, `lint`, `build`, plus a check with the system clock set into each season: decoration appears on all three boards, the toggle in any game's menu switches it off everywhere, Yatzy's themed confetti still fires.

```bash
git add -A && git commit -m "Make seasonal themes available in all games"
```

---

### Task 9: Cleanup, naming and documentation

**Files:**
- Modify: `package.json` (`"name": "wuerfelkarte"`), `README.md`
- Move: `providers/providers.tsx` → `src/app/providers.tsx`
- Delete: dead components confirmed unused (`ModeToggle.tsx`, `CategoryIcons.tsx`, `ui/carousel.tsx`, `ui/avatar.tsx`, `ui/table.tsx` — each verified by grep first)
- Create: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Rename the package** to `wuerfelkarte`; confirm nothing reads the old name.
- [ ] **Step 2: Move the root `providers/` folder** into `src/app/`, so nothing application-level lives outside `src/`.
- [ ] **Step 3: Delete confirmed-dead files.** For each candidate run `grep -rn "<name>" src` and delete only on zero hits. Check `npm ls` for dependencies that become unused (`embla-carousel-react` if the carousel goes).
- [ ] **Step 4: Grep gates.**
  - `grep -rni "kniffel" src` → only the migration module.
  - `grep -rn "@/app/" src/games src/components` → empty.
  - `grep -rn "from \"@/components/\(wizard\|flip7\|yatzy-lobby\|gamemodes\|hooks\)" src` → empty.
- [ ] **Step 5: Write `docs/ARCHITECTURE.md`** — the folder map, the `GameDefinition` contract, the storage-key convention, and a step-by-step "adding a new game" walkthrough that names the exact files to create.
- [ ] **Step 6: Rewrite `README.md`** — it is still the untouched create-next-app boilerplate. Replace with what this project is, how to run it, the test command, and a link to `ARCHITECTURE.md`.
- [ ] **Step 7: Final verification.**
  - `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
  - Legacy-data check: in a browser profile seeded with the old keys (`lastMatches`, `kniffel:roster`, `kniffel:player-names`, `chaoswunderSettings`, `wizard:lastMatches`, `flip7:lastMatches`), load the app and confirm the roster, all three histories and the stats appear intact.
  - Fresh-profile check: empty localStorage, play one game of each to completion.
- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Clean up naming, dead code and documentation"
```

---

### Task 10 (optional, on request): the fourth game

Not part of this refactor — the acceptance test for it. Adding Cabo or Skull King should mean: `src/games/<key>/{config,types,scoring,storage}.ts` + one board component + one registry line + a thin route, with lobby, menu, stats, history, share and player management inherited. If it needs more than that, the abstraction is wrong and gets fixed then.
