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

Roster players can be linked to other accounts by email, so matches with them
also land in their history. That needs
`supabase/migrations/20261110130000_player_links.sql`; without it the section on
`/konto` says it is not set up yet.

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
- **Darts** — X01 on a clickable board, with legs, checkout suggestions and
  three-dart averages.

Seasonal decoration (Halloween, Christmas, Easter) appears in every game during
its window and can be switched off from any game's menu.

## Code

Games live in `src/games/<name>/`, each with the same shape, on top of a shared
kit that provides the lobby, menu, statistics, history, scoreboard and sharing.
Adding a game means writing its rules and one board component.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layout, the storage
conventions and a step-by-step walkthrough for adding a game.
