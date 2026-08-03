# Würfelkarte

Score tracking for dice and card games you play at a real table — Yatzy, Wizard
and Flip 7, with more on the way. No account, no backend: every roster, running
game and result stays in the browser.

Live at [würfelkarte.com](https://www.würfelkarte.com).

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

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

Seasonal decoration (Halloween, Christmas, Easter) appears in every game during
its window and can be switched off from any game's menu.

## Code

Games live in `src/games/<name>/`, each with the same shape, on top of a shared
kit that provides the lobby, menu, statistics, history, scoreboard and sharing.
Adding a game means writing its rules and one board component.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layout, the storage
conventions and a step-by-step walkthrough for adding a game.
