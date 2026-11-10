# Architecture

Würfelkarte is a Next.js App Router app that tracks scores for physical dice and
card games. Everything a group plays lives in their browser's localStorage. An
optional account copies that data to Supabase and back, see
[Accounts and sync](#accounts-and-sync); the daily quiz's global score
distribution is the other thing that talks to a server, see
[Quiz distribution](#quiz-distribution).

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
  components/account/     sign-in, account page, header button
  lib/                    utils, Supabase client, auth, sync/
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
| `resume.ts` | `running<Game>Game()` — the stored game as a "Weiterspielen" card, or `null` |
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
- **`resume.ts`** — the `RunningGame` shape behind the "Weiterspielen" card that
  `LobbyShell` (via its `runningGame` prop) and the home page show for an
  unfinished game. `src/games/runningGames.ts` collects every game's.
- **`migrations.ts`** — one-time move of the pre-refactor localStorage keys.
- **`stats.ts`** — `tallyWins`, `sumByPlayer`, `rateDetail`, `topThree`.
- **`components/`** — `LobbyShell`, `GameShell` pieces (`RoundNav`), `GameMenu`,
  `ManagePlayersDialog`, `PlayerChip`, `PlayerIdentityDialog`, `GamemodePills`,
  `GamemodeStats`, `RecentMatches`, `ResumeGameCard`, `ScoreDialog`,
  `ScoreDiagram`, `ShareResult`.
- **`hooks/`** — `usePlayerRoster`, `useMatchHistory`, `useRunningGames`,
  `useHideScores`.

The board is deliberately **not** shared: Wizard predicts tricks, Flip 7 enters
round points, Yatzy fills a 13-category grid. Generalising those would produce a
configuration language, not less code.

## Storage keys

| Key | Contents |
| --- | --- |
| `wuerfelkarte:roster` | The player roster every lobby picks from |
| `wuerfelkarte:themeActive` | Seasonal decoration on/off |
| `wuerfelkarte:schema` | Migration marker |
| `<game>:game` | The running game — survives reloads and closed browsers |
| `<game>:matches` | Finished matches, keyed by match id |
| `<game>:settings` | Per-game preferences |
| `yatzy:players` | The seating the lobby hands to a fresh Yatzy sheet |
| `quiz:days` | Every quiz day played, so the archive can show and resume it |
| `quiz:submission` | Today's quiz result until the server has it |
| `speedrun:daily` | The last day a ranked Tagesrun was started |
| `speedrun:submission` | Today's ranked Tagesrun until the server has it |
| `wuerfelkarte:sync` | The account sync's bookkeeping: user, cursor, dirty keys |
| `wuerfelkarte:sharing` | Linked players: matches already sent, newest received |

`migrations.ts` brings the old keys (`kniffel:roster`, `lastMatches`,
`chaoswunderSettings`, `wizard:lastMatches`, …) onto these. It writes a new key
only when it does not exist and never deletes the old one, so a rollback still
finds the data.

## Quiz distribution

After a daily quiz the summary shows how everyone did that day
(`src/games/quiz/distribution.ts`, `components/ScoreDistribution.tsx`). The
results live in Supabase, in a `quiz_results` table that RLS closes to the API;
the browser only calls two functions from
`supabase/migrations/20261026120000_quiz_results.sql`:

- `submit_quiz_result(date, token, points)` — only for today (±1 day for time
  zones), once per token. The token is random and made up per day, so nothing
  links one player's days together; no IP or user data is stored.
- `get_quiz_distribution(date)` — players per day total; the app groups them
  into bars.

Only a day finished on its own date is submitted; archive days just show the
chart. The client (`src/lib/supabase.ts`) reads `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Without them, or offline, the chart is
left out and a queued result waits for the next visit.

## Speedrun distribution

The speedrun's Tagesrun works the same way (`src/games/speedrun/distribution.ts`,
`supabase/migrations/20261108120000_speedrun_results.sql`): the day's first
finished run sends its time and penalty with a one-day token through
`submit_speedrun_result`, and `get_speedrun_distribution` returns players per
second of Wertungszeit. The server cannot check the clock, so its checks are
plausibility only.

## Accounts and sync

Accounts are optional and add nothing but the sync: the app still reads and
writes only localStorage, signed in or not.

- **Sign-in** (`src/components/account/`, routes `/konto` and
  `/konto/callback`): Supabase Auth with an email link or a 6-digit code, as in
  Tischleinplandich. The session is kept by supabase-js in localStorage
  (`src/lib/supabase.ts`); `AuthProvider` (`src/lib/auth.tsx`) exposes it and
  starts or stops the sync.
- **What syncs** (`src/lib/sync/keys.ts`): the roster, every game's `:game`,
  `:matches` and `:settings`, `yatzy:players`, `quiz:days` and
  `speedrun:daily`. The quiz and speedrun submissions stay on the device, so
  their tokens never meet an account.
- **How** (`src/lib/sync/engine.ts`): `writeJSON`/`removeKey` report every key
  they change; the sync marks it dirty and uploads it a few seconds later, as
  one row per key in `user_storage` (migration
  `20261110120000_user_storage.sql`, RLS limits each user to their rows). A
  removed key is uploaded as `null`. Downloads ask for rows stamped after the
  last one seen. A row this device did not change replaces the local value;
  one it changed too is merged (`merge.ts`): match histories and the roster are
  combined, quiz days too, and for a running game or settings this device wins.
  The first sign-in on a browser marks all its keys dirty, so games played
  before signing in join the account instead of being overwritten.
- **When**: after sign-in, a few seconds after a change, when the app returns to
  the foreground or comes back online, and on „Abmelden“.
- **Screens**: `useMatchHistory`, `useRunningGames` and `usePlayerRoster` re-read
  storage on the `wuerfelkarte:synced` event (`useSyncRefresh`). A running
  board does not; it keeps what is on the table.

Signing out forgets `wuerfelkarte:sync` but keeps the games on the device.

### Linked players

A roster player can be linked to another account (`/konto` → „Mitspieler
verknüpfen“, migration `20261110130000_player_links.sql`):

1. Jan invites the person behind his roster entry „Tim“ by email
   (`invite_player`). The invite waits in `player_links`; nothing tells Jan
   whether the address has an account.
2. Whoever signs in with that address sees it under „Einladungen“ (a dot on the
   header button) and accepts (`accept_player_link`) or declines (deletes it).
3. After each account sync, `src/lib/links/runner.ts` uploads every match in
   Jan's Yatzy, Wizard, Flip 7, Cabo and Darts histories that has a player with
   the linked roster entry's current name, earlier matches included, into
   `shared_matches`. RLS only lets it through for an accepted link.
   `wuerfelkarte:sharing` remembers a fingerprint per match, so only new or
   corrected matches go out.
4. Tim's devices download them into their `<game>:matches`, marked
   `sharedBy: <Jan's email>`. From there his own sync carries them to his other
   devices; they count in his statistics and show as „Geteilt von …“ in the
   full history. Received matches are never passed on.

Either side can end the link; the shared rows go with it, copies already in
Tim's history stay. The pure rules are in `src/lib/links/share.ts`.

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
   match into the history when the game finishes. Add `resume.ts`, pass it to
   `LobbyShell` as `runningGame` and list it in `src/games/runningGames.ts`.
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
