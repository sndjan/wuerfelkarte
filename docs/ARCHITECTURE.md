# Architecture

Würfelkarte is a Next.js App Router app that tracks scores for physical dice and
card games. There is no backend and no account: everything a group plays lives
in their browser's localStorage.

## Layout

```
src/
  app/                    routes only — every page is a thin wrapper
    layout.tsx  page.tsx  providers.tsx
    yatzy/  wizard/  flip7/
  games/
    registry.ts           every game, playable or "Bald" — feeds the home tiles
    GameTile.tsx
    shared/               the game kit (see below)
    yatzy/  wizard/  flip7/
  components/
    ui/                   shadcn primitives
    common/               PageHeader, DarkModeToggle, seasonal/
  lib/                    utils
```

The rule that keeps this honest: **nothing under `src/games/` or
`src/components/` may import from `src/app/`.** Routes depend on games, never
the other way round.

## A game

Each playable game is one folder with the same shape:

| File | What it holds |
| --- | --- |
| `types.ts` | The game's own data: its game state, round shape, stored match |
| `scoring.ts` | Pure functions — no React, no storage. This is what tests cover |
| `gamemodes.ts` | The modes, their rules text and the slug ↔ key mapping |
| `storage.ts` | `createGameStorage("<key>")` plus any named setting helpers |
| `config.ts` | Share text and statistics config — what the shared UI needs |
| `hooks/useGame.ts` | The state machine: load, mutate, persist, record the match |
| `components/Lobby.tsx` | Setup screen, built on `LobbyShell` |
| `components/Board.tsx` | The playing screen — the one genuinely game-specific UI |

Anything else in `components/` is a part of that game's board (round card,
keypad, history table).

## The shared kit (`src/games/shared/`)

Everything around the board:

- **`storage.ts`** — `createGameStorage(namespace, { defaultSettings, reviveGame })`
  returns `loadGame/saveGame/clearGame`, `loadMatches/saveMatch/removeMatch`
  (match history upserts by id) and `loadSettings/saveSettings`. Keys are
  `<namespace>:game`, `<namespace>:matches`, `<namespace>:settings`.
- **`roster.ts`** — the app-wide player roster, shared by all three lobbies.
- **`migrations.ts`** — one-time move of the pre-refactor localStorage keys.
- **`stats.ts`** — `tallyWins`, `sumByPlayer`, `rateDetail`, `topThree`.
- **`components/`** — `LobbyShell`, `GameShell` pieces (`RoundNav`), `GameMenu`,
  `ManagePlayersDialog`, `PlayerChip`, `PlayerIdentityDialog`, `GamemodePills`,
  `GamemodeStats`, `RecentMatches`, `ScoreDialog`, `ScoreDiagram`,
  `ShareResult`.
- **`hooks/`** — `usePlayerRoster`, `useMatchHistory`, `useHideScores`.

The board is deliberately **not** shared: Wizard predicts tricks, Flip 7 enters
round points, Yatzy fills a 13-category grid. Generalising those would produce a
configuration language, not less code.

## Storage keys

| Key | Contents |
| --- | --- |
| `wuerfelkarte:roster` | The player roster every lobby picks from |
| `wuerfelkarte:themeActive` | Seasonal decoration on/off |
| `wuerfelkarte:schema` | Migration marker |
| `<game>:game` | The running game (Wizard, Flip 7) |
| `<game>:matches` | Finished matches, keyed by match id |
| `<game>:settings` | Per-game preferences |
| `yatzy:players` | Who is at the Yatzy table |

`migrations.ts` brings the old keys (`kniffel:roster`, `lastMatches`,
`chaoswunderSettings`, `wizard:lastMatches`, …) onto these. It writes a new key
only when it does not exist and never deletes the old one, so a rollback still
finds the data.

## Adding a game

1. **Register it.** Add an entry to `src/games/registry.ts` with `locked: false`.
2. **Create `src/games/<key>/`** with `types.ts`, `scoring.ts`, `gamemodes.ts`.
   Write the scoring tests first — they are cheap here because the functions are
   pure.
3. **Add `storage.ts`**:
   ```ts
   export const myStorage = createGameStorage<MyGame, MyMatch, MySettings>(
     "<key>",
     { defaultSettings: { hideScores: false } },
   );
   ```
4. **Add `config.ts`** with `shareConfig(...)` and, if the game has interesting
   numbers, `buildStats(matches)` returning `{ tiles, sections }`.
5. **Write `hooks/useGame.ts`** — load on mount, save on change, and write the
   match into the history when the game finishes.
6. **Build the two screens.** `Lobby.tsx` wraps `LobbyShell` and fills the
   `children` slot with the game's setup controls. `Board.tsx` is yours, but use
   `RoundNav`, `GameMenu` and `ScoreDialog` from the kit.
7. **Add the routes** — `src/app/<key>/page.tsx` and
   `src/app/<key>/[gamemode]/page.tsx`, each a three-line wrapper.

## Testing

`npm test` runs Vitest over the pure logic: every game's scoring, the storage
factory, the roster, the migrations, the share text and the seasonal windows.
There are no component tests — the boards are verified by playing them.

Vitest is pinned to the 2.x line because Vitest 4 requires Node 20 and this
project still builds on Node 18.
