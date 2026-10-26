# Würfelkarte

Score tracking for dice, card and pub games you play at a real table — Yatzy,
Wizard, Flip 7, Cabo and Darts, with more on the way. No account: every
roster, running game and result stays in the browser. Only the daily quiz
sends its day total, anonymously, for the global score distribution.

Live at [würfelkarte.com](https://www.würfelkarte.com).

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

The quiz's score distribution needs `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`; without them the app
runs as before, just without the chart.

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
