# Game Architecture Refactor: One Shared Shell, Three Games, Easy Fourth

## Context

The app has grown from one game (Yatzy, originally "Kniffel") to three (Yatzy, Wizard, Flip 7), and the structure never grew with it. Wizard and Flip 7 were each added by copying the previous game's folder, so the repo now carries the same component three times with cosmetic drift, and `src/components/` mixes four unrelated concerns.

Measured state (12,383 lines of TS/TSX across 106 files):

**Near-duplicate components** — same code, different names, small drift:

| Component | Copies | Lines | Real differences |
| --- | --- | --- | --- |
| `Share.tsx` | 3 | 401 / 293 / 291 | emoji, header text, mode label, one PNG font size |
| `AnimatedScoreDiagram.tsx` | 3 | 74 / 80 / 85 | Flip 7 counts up in steps of 2 |
| `Menu` / `WizardMenu` / `Flip7Menu` | 3 | 162 / 176 / 182 | which dialogs the entries open |
| `GamemodePillSelector` | 3 | 32 / 33 / 34 | Flip 7 keeps a border in both states |
| `RecentMatchesList` | 3 | 58 / 61 / 59 | Wizard shows a ±1 badge |
| `GamemodeStats` | 3 | 193 / 160 / 219 | per-game extra stat column |
| `ManagePlayersDialog` | 2 | 365 / 284 | Wizard confirms a new round count when adding |
| `HistoryTable` | 2 | 105 / 97 | cell rendering per game |
| `storage.ts` | 2 (+1 partial) | 88 / 119 | key prefix; Flip 7 upserts matches, Wizard pushes |
| `use*MatchHistory` | 3 | 15 / 15 / 32 | the loader they call |

**Mixed directories** — `src/components/` currently holds Yatzy's game components (`PlayerCard`, `Scoring`, `Share`, `AddPlayer`, `EditPlayer`, `ResetGame`, `CategoryIcons`), generic ones (`PageHeader`, `DarkModeToggle`, `ui/`), the seasonal themes, a `hooks/` folder that is half Yatzy-specific (`useKniffel`) and half app-wide (`usePlayerRoster`), and `yatzy-lobby/` — which despite its name holds the player chip and add-player dialog that **all three** lobbies import.

**Naming drift** — `useKniffel` vs `useWizard` vs `useFlip7`; `Menu` vs `WizardMenu`; storage keys `lastMatches`, `kniffel:roster`, `kniffel:player-names`, `chaoswunderSettings`, `wizard:lastMatches`, `flip7:lastMatches`; package name `kniffel`.

**Layering violations** — `useTheme.ts`, `ThemeManager.tsx` and `PlayerCard.tsx` import the `Theme` type from `@/app/yatzy/[gamemode]/page`, i.e. shared code depends on a route module. `PlayerCard` imports `../../public/points.json` by relative path out of `src/`.

**Structural imbalance** — Wizard and Flip 7 already converged on a good per-game shape (`types.ts` / `scoring.ts` / `storage.ts` / `gamemodes.ts` / `hooks/`), and their two `[gamemode]/page.tsx` files are structurally the same page. Yatzy is the outlier: numeric player ids, a category-grid board, a 587-line page mixing themes, Chaoswunder missions, Battle mode and settings, and no saved-game persistence.

Adding game #4 (Cabo, Skull King, Uno, Mäxle and Schwimmen are already listed as locked tiles) currently means copying ~1,500 lines and renaming them.

## Goals

- **Adding a game means writing a config, a scoring module and one board component.** Lobby, menu, match history, statistics, share, score dialog, player management and storage come from a shared kit.
- **One home for each concept.** Per-game code in `src/games/<game>/`, routes in `src/app/` as thin wrappers, genuinely shared UI in `src/components/{ui,common}`.
- **No duplicate components.** Each of the ten duplicates above collapses into one implementation, unified to the best behaviour of the variants.
- **Consistent naming.** No `kniffel` anywhere; app-level things are namespaced `wuerfelkarte:`, per-game things `yatzy:` / `wizard:` / `flip7:`; per-game components drop their game prefix because the folder already carries it.
- **Yatzy fully migrated with nothing lost.** Battle mode, Chaoswunder missions and their settings, seasonal themes, confetti, the point grid, player reordering, the `X` (cross out) mechanic and the mission progress dots all survive unchanged.
- **Seasonal themes become app-wide.** Halloween / Christmas / Easter decoration renders on all three game boards, toggled from every game's menu, backed by one app-wide setting.
- **No user data loss.** Storage keys are unified, with a one-time migration that carries over rosters, match histories, running games and settings from the old keys.
- **The pure logic gets a test suite** — written before the code moves, so it proves the refactor changed no behaviour.

## Non-goals

- No visual redesign. Layouts, colours and copy stay as they are, except where two variants disagree and the better one wins (listed under "Accepted drift" below).
- No new gameplay features. Yatzy does not gain resume-a-running-game; that is a possible follow-up, not part of this refactor.
- No new confetti moments for Wizard and Flip 7.
- No i18n. UI strings stay German, identifiers stay English.
- No unlocking of the locked games (Cabo, Skull King, Uno, Mäxle, Schwimmen) — the registry keeps listing them as tiles only.
- No backend, no accounts. Everything stays localStorage-only.
- No component-level UI tests. The new test suite covers pure logic and storage migrations.

## Target structure

```
src/
  app/                          routes only — thin wrappers, no game logic
    layout.tsx  page.tsx  globals.css  manifest.ts  providers.tsx
    yatzy/page.tsx  yatzy/[gamemode]/{page,layout}.tsx
    wizard/…  flip7/…
  games/
    registry.ts                 every game incl. locked ones → home tiles + routing
    shared/                     the game kit
      types.ts                  RosterPlayer, ScoredPlayer, MatchPlayer, StoredMatch
      config.ts                 GameDefinition contract
      storage.ts                createGameStorage() factory
      migrations.ts             legacy key → new key, run once at boot
      hooks/                    usePlayerRoster, useMatchHistory, useHideScores
      components/               Lobby, GameShell, GameMenu, ManagePlayersDialog,
                                GamemodePills, PlayerChip, PlayerIdentityDialog,
                                RecentMatches, GamemodeStats, ScoreDialog,
                                ScoreDiagram, ShareResult, RoundNav
    yatzy/
      config.ts  types.ts  scoring.ts  storage.ts  points.ts
      gamemodes/{index,battle,chaoswunder}.ts
      hooks/useGame.ts
      components/{Board,PlayerCard,PointGrid,ChaosMissions,BattleBadges,Menu}.tsx
    wizard/                     config, types, scoring, storage, specialCards,
      …                         hooks/useGame.ts, components/{Board,RoundCard,…}
    flip7/                      same shape
  components/
    ui/                         shadcn primitives (unchanged)
    common/                     PageHeader, DarkModeToggle, seasonal/
  lib/                          utils
```

## The contract

A game is one `GameDefinition` object plus a board component:

```ts
export type GameDefinition<TGame, TMatch> = {
  key: "yatzy" | "wizard" | "flip7" | …;
  name: string;                       // "Flip 7"
  emoji: string;                      // "7️⃣"
  locked?: boolean;                   // locked tiles need nothing else
  alternativeNames?: string[];        // search aliases, e.g. Kniffel/Yahtzee

  players: { min: number; max: number };
  gamemodes: Record<string, GamemodeConfig>;
  gamemodeInformation(mode, game?): string[];   // rules text incl. per-game addenda

  storage: GameStorage<TGame, TMatch>;          // from createGameStorage()
  statColumns: StatColumn<TMatch>[];            // extra columns in GamemodeStats
  share: ShareConfig<TGame>;                    // header emoji + mode label
};
```

`GameShell` (header, round navigation, hide-scores toggle, empty state) and `Lobby` (roster chips, gamemode pills, start button, stats, recent matches, plus an `extras` slot for target score / special cards / round count) read from that object. The board stays hand-written per game, because Wizard (bids/tricks), Flip 7 (points/bust/flip7) and Yatzy (13-category grid) have genuinely different input models — generalizing them would produce a config language, not less code.

## Storage keys and migration

| Old key | New key | Notes |
| --- | --- | --- |
| `kniffel:roster` | `wuerfelkarte:roster` | shared by all lobbies, not Yatzy-owned |
| `kniffel:isThemeActive` | `wuerfelkarte:themeActive` | app-wide seasonal toggle |
| `lastMatches` | `yatzy:matches` | entries reshaped to `StoredMatch` (id, name/emoji/score, gamemode, timestamp, durationMs); the old shape stored whole `Player` objects including their point sheets |
| `kniffel:player-names` | `yatzy:players` | |
| `chaoswunderSettings` | `yatzy:settings` | merged into the per-game settings blob |
| `wizard:lastMatches` | `wizard:matches` | |
| `flip7:lastMatches` | `flip7:matches` | |
| `wizard:game`, `flip7:game`, `wizard:settings`, `flip7:settings` | unchanged | |

Migration runs once on first client render, guarded by `wuerfelkarte:schema` = `1`. It only writes a new key when that key is absent, and it **leaves the old keys in place** so a rollback of the deployment does not strand anyone's history.

## Accepted drift resolutions

Where the duplicates disagree, the merged component takes the better behaviour — these are the deliberate, user-visible changes:

1. **Share text**: medals/numbers for ranks 1–10 (Yatzy's version) apply to all games; Wizard and Flip 7 previously stopped numbering at 6.
2. **Score diagram**: the count-up step is derived from the score range instead of being hardcoded (Flip 7's step of 2, everyone else's 1), so long Yatzy and Wizard totals animate at a sane speed too.
3. **Gamemode pills**: the bordered variant (Flip 7) everywhere, so pills don't resize when selected.
4. **Match history**: upsert-by-id (Flip 7) for all games. This replaces Yatzy's 2-minute-debounce duplicate guard, which silently dropped a legitimate second short game and duplicated a corrected one.
5. **Recent matches / stats badges**: driven by `statColumns` config, so Wizard keeps its ±1 badge and Yatzy keeps its adjusted win rate, but from one component.
6. **Player dialogs**: `AddPlayer` (name only), `AddPlayerDialog` (name + emoji) and `PlayerIdentityDialog` (roster picker + new player + edit) collapse into `PlayerIdentityDialog`, which is the superset. Yatzy's in-game "add player" therefore gains the emoji picker and roster picker it already had in the lobby.

## Seasonal themes

`Theme`, `useSeasonalTheme` and `ThemeManager` move to `src/components/common/seasonal/`, breaking the dependency on the Yatzy route module. `ThemeManager` renders behind the board of all three games (Wizard and Flip 7 gain the decoration), the on/off entry appears in the shared `GameMenu` for every game during a season, and the setting is the single app-wide `wuerfelkarte:themeActive`. The `gamemode !== "MiniWunder"` exception in `HalloweenTheme` becomes a prop the Yatzy board passes, not a hardcoded string check. Themed confetti stays Yatzy-only.

## Verification

- **New**: Vitest with characterization tests for `yatzy/scoring` (all six gamemodes, bonus thresholds, `X` handling), `yatzy/gamemodes/battle` (`battleTotalScore`, `getBattleFieldStatus`, `isForcedSuccess`), the Chaoswunder mission selection (extracted to a pure, seedable function), `wizard/scoring` (bids, Bombe, Wolke, ±1, deck size, suggested rounds), `flip7/scoring` (bust, Flip 7 bonus, absent players, target reached, tie at top), the share-text builders, and every storage migration path from real legacy payloads. Written **before** any code moves; the suite must stay green through every subsequent task with only import paths changed.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` after each task.
- Manual click-through after the Yatzy task and at the end: all three lobbies (add/select/reorder/rename/remove players, mode switch, stats, recent matches), one full game per game, Battle mode, Chaoswunder with both settings toggles, score dialog + share (text and PNG), seasonal theme forced on, and a browser profile carrying legacy localStorage data to confirm the migration.
- Grep gates: no `kniffel` outside the migration module, no imports from `@/app/**` inside `src/games/**` or `src/components/**`, no remaining duplicate component names.

## Risks

- **The 587-line Yatzy page is the danger zone.** Battle's `doubled` set, the Chaoswunder mission index effects and the horizontal scroll-to-next-player behaviour are stateful and untested today. Mitigation: characterization tests first, split the page in one dedicated task, and click through before committing.
- **Migration correctness.** A bug loses real users' history. Mitigation: tests over captured legacy payloads, new keys written only when absent, old keys retained.
- **Import churn.** Nearly every file moves. Mitigation: one game per task, `tsc` after each step, no behaviour edits in the same commit as a move.
