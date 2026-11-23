# Würfelkarte

Score tracking for dice, card and pub games you play at a real table — Yatzy,
Wizard, Flip 7, Cabo and Darts, with more on the way. Every roster, running
game and result lives in the browser; an optional account (sign-in by email
link or code, no password) syncs them across devices. The daily quiz and the
speedrun's Tagesrun send their result anonymously for a global distribution.

Live at [würfelkarte.com](https://www.würfelkarte.com).

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

The quiz's score distribution and the accounts need `NEXT_PUBLIC_SUPABASE_URL`
and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`; without them the
app runs as before, just without the chart and without the account button.

## Accounts

`/konto` signs in with Supabase Auth: an email with a link and a 6-digit code,
one button for new and existing accounts. Signed in, the browser's game data is
synced through the `user_storage` table (see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#accounts-and-sync)).

Setup in the Supabase dashboard:

1. Run `supabase/migrations/20261110120000_user_storage.sql`. Until then the
   account page says the sync is not set up yet; everything else works.
2. **Authentication → Emails → Templates**: paste
   `supabase/templates/sign-in.html` into **Magic Link** and **Confirm signup**
   (subject: „Dein Anmeldelink für Würfelkarte“). It links to
   `/konto/callback?token_hash=…`, which works in any browser, and shows the code
   for the installed app.
3. **Authentication → Providers → Email**: email OTP length 6.
4. **Authentication → URL Configuration**: Site URL
   `https://www.xn--wrfelkarte-9db.com` (www.würfelkarte.com in ASCII) and `<site>/konto/callback` as a
   redirect URL.
5. For real traffic, own SMTP under **Authentication → Emails → SMTP Settings**;
   Supabase's built-in sender only manages a few mails per hour.

Every account has a Konto-ID like `Jan#4821`. Roster players can be linked to
another account by its ID; once accepted, they carry that account's name in
every match and statistic, and matches with them also land in their history.
Links go both ways, so both people get each other's matches. That needs
`supabase/migrations/20261110130000_player_links.sql` and
`20261111120000_mutual_links.sql` (after the user_storage one); without them
the section on `/konto` says it is not set up yet. Then run
`20261112120000_shared_matches_limit.sql`, which caps how many matches one
account can send another, and `20261115120000_links_both_ways_at_once.sql`,
which accepts an invite and links back in one step (so a link can never end
up one-way) and links two people at once when both invited each other.
`20261115130000_profile_emoji.sql` lets every account pick its emoji, which
everyone linked to it then shows.

### Kniffel Online

`/online` plays Yatzy (every mode) with linked accounts, each on their own
phone, with digital dice the server rolls or with real dice entered by hand.
Setup:

1. Run `supabase/migrations/20261111130000_online_games.sql` (after the
   player_links and mutual_links ones), then
   `20261111140000_online_service_grants.sql`, which gives the secret key
   its rights on the tables even where new tables are not exposed to the API
   automatically. The first also adds both online tables to the
   `supabase_realtime` publication; check under **Database → Publications**
   that they are listed.
2. In the hosting (Vercel) environment, set `SUPABASE_SECRET_KEY` to the
   project's secret key (**Project Settings → API Keys**, `sb_secret_…`; the
   legacy `service_role` key works too, also as `SUPABASE_SERVICE_ROLE_KEY`).
   It is only read on the server by `/api/online`, never sent to the browser.
   A publishable or anon key there is refused (the server log says so).
   Without it the page says online games are not set up yet.
3. For players without an account: run
   `supabase/migrations/20261115140000_online_invite_links.sql` and turn on
   **Authentication → Sign In / Providers → Allow anonymous sign-ins**. The
   host shares a link from the lobby („Link teilen“); whoever opens it types
   a name and joins as a guest. Without the switch, the link page says
   playing without an account is not set up yet. Consider turning on
   CAPTCHA protection there as well, since anyone can create anonymous users.

### Speedrun-Bestenliste

The Speedrun start screen shows a global leaderboard (Klassisch, random seeds
only). Run `supabase/migrations/20261116120000_speedrun_leaderboard.sql`
(after the profile_emoji one). Signed-in accounts with a name send their best
run; the server keeps one row per account. Until the migration has run, the
start screen says the leaderboard is not reachable.
Then run `supabase/migrations/20261116130000_speedrun_leaderboard_seed.sql`, so
the list shows each run's seed and a tap on a row plays it. Before that, the
list works without seeds.

### Papierblock (Scan)

`/scan` (linked only at the bottom of the home page, and from the QR code on
the paper) reads a photo of the printed Kniffelblock with Claude and turns it
into a running game on the Würfelkarte (mode Wunder). Each column is given to
a roster player first: names are matched loosely against the roster
(`src/games/scan/players.ts`), and a column without a fitting name is picked by
hand or added as a new player, so the game counts in everyone's statistics.
On the board, values the reader was unsure of and ones that cannot be right
(those arrive empty) carry a „?“ until they are entered again
(`src/games/scan/handoff.ts`, this device only). Nothing gives the winner
away before the scoreboard: the column screen shows no points, and the board
covers the totals until „Auswertung“ has counted them up. The block
is `public/kniffelblock.pdf`: four A6 cards on one A4 page, one game for up to
four players; `npm run kniffelblock` rebuilds it from
`scripts/kniffelblock/build.mjs` (needs Playwright). While it is read, a scan line runs over the photo. The reader only
transcribes; totals, the bonus and the plausibility checks are in
`src/games/scan/sheet.ts`.

1. Set `ANTHROPIC_API_KEY` in the hosting environment. Without it the page
   says reading is not set up yet. The model is `claude-haiku-5-5`
   (`SCAN_MODEL` overrides it); one scan costs roughly 0.06 cents.
2. Run `supabase/migrations/20261123120000_scan_usage.sql`. It counts scans
   per visitor (a salted hash of the IP, `SCAN_SALT`) and for the whole site
   per day: `SCAN_LIMIT_PER_DAY` (default 20) and `SCAN_LIMIT_GLOBAL`
   (default 2000). Without the migration each server instance counts in
   memory only.
3. Set a monthly spend limit for the API key's workspace in the Claude
   Console as the hard ceiling.

Deleting the account (`/konto` → „Konto löschen“) calls
`delete_own_account()`, which removes the auth user; `user_storage` goes with it
by cascade. The games on the device stay.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Vitest over the game logic, storage and migrations |
| `npm run lint` | ESLint |
| `npm run emoji` | Download the Noto emoji used in `src/` into `public/emoji/` (behind a proxy: `NODE_USE_ENV_PROXY=1`) |

## The games

- **Yatzy** — the classic sheet, plus the Wunder+, Mini, Super, Battle and
  Chaoswunder variants.
- **Wizard** — trick prediction, including the 25 Jahre Edition Sonderkarten.
- **Flip 7** — press your luck to seven different number cards.
- **Cabo** — the lowest hand wins.
- **Kniffel-Training** — a whole solo game with digital dice; every decision
  (which dice to keep, when to stop, which field to fill) is graded against the
  optimal solver as you make it, with the better move and the ranked top moves.
- **Kniffel-Speedrun** — a whole solo card against the clock. The result is
  the time plus one second per expected point a decision gives away, so it
  measures how well you decide, not how lucky the dice were. Any%, Klassisch
  and a daily Tagesrun on dice everyone shares.
- **Kniffel Online** — Yatzy in every mode with linked accounts on their own
  phones, or with anyone via an invite link (no account needed): invite up to five, play live or one move at a time, with dice the
  server rolls (the app scores every field, Battle and Chaoswunder missions
  included) or real dice entered by hand. Totals stay hidden until the host
  starts the scoreboard. Results land in everyone's Yatzy history.
- **Darts** — X01 on a clickable board, with legs, checkout suggestions and
  three-dart averages.

Seasonal decoration (Halloween, Christmas, Easter) appears in every game during
its window and can be switched off from any game's menu.

## Emoji

Every emoji in the app is drawn from Google's Noto Emoji, so it looks the same
on iOS, Android and desktop, and plays its Noto animation once when it, or the
button it sits in, is tapped. The files live in `public/emoji/` and the app
never loads them from Google. After using a new emoji anywhere in `src/`, run
`npm run emoji` and commit the new files.

Credits are on `/lizenzen` and in `public/emoji/LICENSE.md`: the animations
are [Noto Emoji Animation](https://googlefonts.github.io/noto-emoji-animation/)
by Google, CC BY 4.0; the static images are
[Noto Emoji](https://github.com/googlefonts/noto-emoji) by Google, Apache
License 2.0. Both are used unchanged.

## Code

Games live in `src/games/<name>/`, each with the same shape, on top of a shared
kit that provides the lobby, menu, statistics, history, scoreboard and sharing.
Adding a game means writing its rules and one board component.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layout, the storage
conventions and a step-by-step walkthrough for adding a game.
