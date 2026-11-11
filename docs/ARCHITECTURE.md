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
| `wuerfelkarte:self` | The roster entry that is the signed-in user (synced) |
| `online:saved` | Online games already written into the Yatzy history on this device |

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

The account page uses no dialogs: inviting a player and confirming the
account deletion open in place, which sits better on a phone.

### Account names and linked players

Every account picks a name and gets a four-digit tag, its Konto-ID
(„Jan#4821“, `profiles`, set through `set_profile_name`). A roster player can
be linked to another account by that ID (`/konto` → „Mitspieler verknüpfen“,
migration `20261110130000_player_links.sql`):

1. Jan enters „Tim#0193“ for his roster entry „Timmi“ (`invite_player`).
2. Tim sees the invite under „Einladungen“ (a dot on the header button) and
   accepts (`accept_player_link`) or declines (deletes it).
3. After each account sync, `src/lib/links/runner.ts`:
   - renames „Timmi“ in Jan's roster to Tim's account name, and every match,
     running game and Yatzy seating with „Timmi“ in it (`names.ts`). The old
     name goes into the roster entry's `formerNames`, so a match finished on a
     board that was open during the rename is caught next time. If Tim renames
     his account, Jan's data follows. Statistics count by name, so two roster
     players never share one: an unlinked „Tim“ in the way becomes „Tim (2)“
     (his matches too) and a warning toast says so; if two linked accounts
     are both called Tim, the second gets „Tim (2)“.
   - does the same for the roster entry Jan marked as himself („Das bin ich“,
     synced key `wuerfelkarte:self`), so Tim's copies show Jan's account name.
   - uploads every Yatzy, Wizard, Flip 7, Cabo and Darts match with a linked
     player, earlier ones included, into `shared_matches` (RLS only for an
     accepted link). `wuerfelkarte:sharing` keeps a fingerprint per match, so
     only new, corrected or renamed matches go out.
   - downloads matches shared with this account into `<game>:matches`, marked
     `sharedBy: "Jan#4821"`. The account sync carries them to the user's other
     devices; they count in the statistics and show as „Geteilt von …“ in the
     full history. Received matches are never passed on.

Either side can end a link; the shared rows go with it, copies already in the
other history stay. Profiles are readable only by the account itself and
accounts linked with it; looking up an ID happens inside `invite_player`.

## Kniffel Online

`/online` and `/online/[id]` (`src/games/online/`) play Yatzy with linked
accounts, each on their own device. Unlike every other game it lives on the
server, not in localStorage.

- **Rules** (`engine.ts`, `dice.ts`, `missions.ts`): pure functions over one
  JSON state — seats with their points, whose turn it is, the dice of the
  turn. `dice.ts` scores dice per field for every mode (3 dice in Mini, 6 in
  Super, sixes as jokers); `missions.ts` reads the Chaoswunder missions as
  dice rules (max rolls, faces that stay, keep-one, all-at-once, even/odd,
  extra rolls, two preset dice, joker). The engine enforces Battle (claimed
  fields are blocked, crossed ones forced, a forced success counts double)
  and the extra-Wunder rule of Wunder+ and Battle (+50 in the Wunder box,
  entry only in a fitting field or a crossed one). The board runs the same
  functions to show what each field would score.
- **Tables** (`supabase/migrations/20261111120000_online_games.sql`):
  `online_games` (settings, `state` jsonb, a `version` for optimistic
  writes) and `online_game_players` (invited / accepted / left, and an
  `active` flag with a partial unique index: one game at a time). RLS lets
  participants read; nobody writes from the browser.
- **Server** (`server.ts`, route `src/app/api/online/route.ts`): every action
  — create, invite, respond, start, roll, score, correct, leave, remove,
  cancel — is a POST with the user's access token. The route checks it,
  validates the move with the engine, rolls with `crypto.getRandomValues`
  and writes with the secret key (`SUPABASE_SECRET_KEY`), retrying when the
  `version` moved in between. `server.test.ts` runs the flows against an
  in-memory stand-in (`fakeDb.ts`).
- **Who can be invited**: accounts with an accepted player link, either
  way. Someone in a lobby or running game is shown as „spielt gerade“ and
  cannot be invited; accepting an invite or hosting drops one's other
  invites. Starting withdraws unanswered invites and shuffles the seats.
- **Live** (`hooks/useOnline.ts`): Realtime `postgres_changes` on both
  tables, a broadcast channel per game for the dice the player on turn is
  holding, plus a reload on focus and a slow poll as a safety net.
- **Leaving**: a player can leave and the host can take someone out; their
  column stays as it is and the turn skips them. The host role passes on if
  the host leaves. Only the host can correct a cell, and only with real dice.
- **Hidden scores**: the board shows every cell but no totals, bonus
  progress or ranking until the host starts the scoreboard (🏆, action
  `reveal`, sets `state.revealedAt`) — during the game after a confirmation,
  or once it is over. It then opens for everyone watching.
- **History**: a finished game is written into each player's
  `yatzy:matches` (`toMatch`, marked `online: true`) the next time their app
  sees it; `online:saved` remembers it per device so a deleted entry stays
  deleted. Online matches are not passed through `shared_matches`, since
  every player's account records them itself.

Not yet: push notifications. Invites and „Du bist dran“ show in the app
(home page and `/online`).

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
