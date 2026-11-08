# Kniffel-Speedrun

## Context

Kniffel-Training ([src/games/training/](../../../src/games/training/)) plays a whole
solo game on digital dice and grades every decision against the solver as it is
made. It is built for thinking slowly: each move stops for feedback, a ranking of
the top moves and a "Weiter" tap.

A speedrun mode turns the same solo game into a race: fill all 13 fields as fast
as possible, without the solver interrupting, and compare the time against your
own personal best and — once a day, on dice everyone shares — against everyone
else. The solver comes back only after the finish line, to show what the speed
cost.

Most of the parts exist already:

- Dice, holding and rerolls: the training's `TurnView` / the quiz's `DiceDock` and `Die`.
- Fair shared dice: the quiz's `seededRandom` and `reroll(dice, held, faces)`
  ([src/games/quiz/puzzles.ts](../../../src/games/quiz/puzzles.ts)), which hands out rerolled
  faces by sorted slot so everyone keeping the same values sees the same dice.
- Scoring without the 2 MB solver table: `scoreCategory` in
  [src/games/yatzy/solver.ts](../../../src/games/yatzy/solver.ts) (tournament rules).
- Post-game grading: `gradeKeep`, `gradeScore`, `trainingStats`, `biggestMistakes`.
- Anonymous daily distribution: the `quiz_results` table and
  [src/games/quiz/distribution.ts](../../../src/games/quiz/distribution.ts).
- Storage, resume and match history: `createGameStorage`, `RunningGame`.

## Goals

- A new game **Kniffel-Speedrun** (⏱️, route `/speedrun`, folder `src/games/speedrun/`)
  listed in the registry next to Quiz and Training.
- A run is one full solo card (13 turns, tournament rules) against a running clock.
- Three categories:
  | Category | Dice | Target | Ranked against |
  | --- | --- | --- | --- |
  | **Any%** | random | none | own PB |
  | **200er** (default) | random | 200 points | own PB |
  | **Tagesrun** | seeded per day, same for everyone | the day's *Par* | own PB + everyone (anonymous) |
- One number per run, the **Wertungszeit**: real time plus penalty seconds for
  every point below the category's target. Every run can always be finished; a
  bad card is slow, not invalid.
- Live splits per turn against the personal best, LiveSplit-style.
- Built for speed: no confirmations, no feedback during the run, one tap per
  decision on mobile, full keyboard control on desktop.
- After the finish: the solver's analysis of the run (expected points given
  away, biggest mistakes), reusing the training's summary pieces.

## Non-goals

- No named or global leaderboard, no accounts. The app's promise ("nothing
  leaves the browser except the anonymous quiz total") extends only to the
  Tagesrun's anonymous time, same as the quiz.
- No server-side verification of times. The server can replay a Tagesrun's
  score from its seed and decisions, but not its clock; the distribution is for
  fun, not for prizes.
- No multiplayer race or ghost of another player.
- No Yatzy variants (Wunder+, Mini, …) — tournament rules only, so Par and the
  solver analysis stay comparable.

## Rules of a run

**Timing**

- The clock starts on the first "Würfeln" tap, not on page load. Before that the
  board shows the category, the PB and a large start button.
- The clock stops the moment the 13th field is entered.
- Real time (RTA): the clock is `now − startedAt`. Leaving the tab, locking the
  phone or reloading does not pause it. A reloaded run resumes with the clock
  still running, so reloading is never an advantage.
- Dice animations are the same length for everyone and short (≤ 200 ms); input
  during an animation is accepted and applies to the final faces. There is an
  option to switch the shake off entirely.

**Wertungszeit**

```
penalty  = max(0, target − score) × 1 s
wertung  = time + penalty
```

- Any%: `target = 0` → `wertung = time`.
- 200er: `target = 200`. A 185-point card in 1:12.4 scores 1:27.4.
- Tagesrun: `target = Par`, the score the optimal solver reaches on that day's
  seed (deterministic, because rerolled faces are fixed by slot). Finishing
  above Par costs nothing extra — there is no bonus for it either, so the race
  stays about speed.

One second per point keeps the trade-off honest: thinking 5 seconds longer is
worth it only if it gains more than 5 points.

**Tagesrun**

- Seed `kniffel-speedrun:YYYY-MM-DD`. Each turn draws its first roll and two
  sets of reroll faces from the seeded stream up front (`TurnDice = { first,
  next: [number[], number[]] }`), and rerolls go through the quiz's `reroll()`,
  so the dice depend only on the values kept, never on timing or which of equal
  dice was tapped.
- The **first finished** Tagesrun of the day is the ranked one and is sent to
  the distribution. Further attempts on the same seed are marked "Übung" — they
  can still beat the PB but are not submitted (the dice are known by then).
- A started but unfinished ranked run stays the ranked run; abandoning it
  submits nothing and the day's ranked slot is used up.

**During the run**

- Every free field shows what the current dice would score in it (as the quiz
  `Scorecard` does with `+n`), so no mental arithmetic is needed.
- Tapping a field enters it immediately. No undo.
- Holding a die is one tap; "Würfeln" rerolls. With no rolls left only fields
  are tappable.
- The Wunder bonus rule (extra Wunder must go into a free matching field) is
  enforced: disallowed fields are greyed out, as in training.

## Screens

### 1. Start (`/speedrun`)

```
┌─────────────────────────────────────┐
│ ←  Kniffel-Speedrun                 │
├─────────────────────────────────────┤
│  [ Any% ]  [ 200er ]  [ Tagesrun ]  │  ← segmented control
│                                     │
│  Persönliche Bestzeit   1:38,2      │
│  Summe der Bestsplits   1:31,7      │
│  Läufe                  23          │
│                                     │
│        ┌─────────────────────┐      │
│        │   ▶  Würfeln        │      │  ← starts the clock
│        └─────────────────────┘      │
│  Leertaste startet · ⌨️ Tastenkürzel  │
└─────────────────────────────────────┘
```

For the Tagesrun the stats block shows the day's Par instead of sum of best and,
once the ranked run is done, "Heute schon gelaufen: 1:44,9 · besser als 62 %".

### 2. Run

```
┌─────────────────────────────────────┐
│  1:04,3         Zug 8/13     −2,4   │  ← timer · turn · delta to PB (green/red)
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░            │  ← 13 segments, each split-coloured
├─────────────────────────────────────┤
│  Einser   3  │ Dreierpasch    +17   │
│  Zweier   6  │ Viererpasch     ❌   │  ← compact two-column card,
│  Dreier  +9  │ Full House     +25   │    previews on free fields
│  Vierer  16  │ Kl. Straße     30    │
│  Fünfer  +5  │ Gr. Straße      ❌   │
│  Sechser 24  │ Wunder          ❌   │
│  Bonus 49/63 │ Chance         +17   │
│              │ Gesamt         142   │
├─────────────────────────────────────┤
│        ⚃  ⚃  ⚃  ⚄  ⚀                │  ← tap to hold
│   [ Würfeln  ●● ]                   │  ← dots = rolls left
└─────────────────────────────────────┘
```

- Timer in tabular numerals, tenths of a second, always visible (sticky top).
- Delta to the PB's cumulative split for the same turn: green when ahead, red
  when behind, gold when this turn's split is the fastest ever (a "Goldsplit").
- In the 200er/Tagesrun a small projection under Gesamt: "auf Kurs: 212" — the
  current score plus the solver-free expected rest (a fixed table of average
  points per open field, no solver needed), so the player sees whether the
  penalty is coming.
- Everything that does not help the next tap is hidden: no menu, no hint
  button, no move feedback. The header's back arrow asks once ("Lauf abbrechen?").
- Card and dice fit one phone screen without scrolling (the card is the
  compact layout from #39, dice docked at the bottom for the thumb).

### 3. Finish

```
┌─────────────────────────────────────┐
│         🏁  1:31,2   Neue Bestzeit!  │
│   Zeit 1:27,2 + Strafe 4,0 (196 P.)  │
├─────────────────────────────────────┤
│  Splits                 Δ PB        │
│   1  Sechser   0:05,1   −0,8  ★     │  ★ = gold split
│   2  Kl. Str.  0:11,9   +1,2        │
│   …                                 │
├─────────────────────────────────────┤
│  Analyse      Ø Zugqualität 87      │  ← loads the solver now
│  Verschenkt   23,4 erwartete Punkte │
│  Größte Fehler (from biggestMistakes)│
├─────────────────────────────────────┤
│  [ Nochmal ]   [ Teilen ]           │
└─────────────────────────────────────┘
```

- Tagesrun adds the anonymous distribution of Wertungszeiten (the quiz's
  `ScoreDistribution` with time buckets) and "besser als n %".
- "Teilen" uses the shared share kit: `⏱️ Kniffel-Speedrun 8.11. · 1:31,2 (196 P.) · würfelkarte.com/speedrun`.
- "Nochmal" starts a new run of the same category with one tap — the
  restart loop must be instant, it is what speedrunners do most.

## Keyboard (desktop)

Keys by physical position (`KeyboardEvent.code`), so they work on QWERTZ and
QWERTY alike:

| Keys | Action |
| --- | --- |
| `1`–`5` | hold / release die 1–5 |
| `Space` | Würfeln (also starts the run) |
| `Q W E R T Z` | Einser … Sechser |
| `A S D F G H J` | Dreierpasch, Viererpasch, Full House, Kl. Straße, Gr. Straße, Wunder, Chance |
| `Enter` on finish | Nochmal |
| `Esc` | Lauf abbrechen (asks once) |

Each field shows its key as a small hint when a hardware keyboard was used
(first keydown), hidden on touch.

## Data model (`src/games/speedrun/types.ts`)

```ts
export type SpeedrunCategory = "any" | "200" | "daily";

/** One decision, as it happened. Enough to replay the run with the solver. */
export type RunEvent =
  | { kind: "roll"; at: number; dice: number[] }                  // first roll of a turn
  | { kind: "keep"; at: number; held: boolean[]; dice: number[] }  // dice after the reroll
  | { kind: "score"; at: number; category: Category; points: number; bonus: number };

export type SpeedrunGame = {
  id: string;
  category: SpeedrunCategory;
  /** Tagesrun only. */
  date?: string;
  /** Tagesrun only: false for attempts after the day's first. */
  ranked?: boolean;
  /** Wall-clock ms of the first roll; undefined before the start. */
  startedAt?: number;
  finishedAt?: number;
  card: QuizCard;
  dice: number[];
  held: boolean[];
  rollsLeft: RollsLeft;
  rolled: boolean;
  /** `at` is ms since startedAt. */
  events: RunEvent[];
};

export type StoredSpeedrunMatch = StoredMatch<MatchPlayer> & {
  category: SpeedrunCategory;
  date?: string;
  ranked?: boolean;
  timeMs: number;
  penaltyMs: number;
  wertungMs: number;
  score: number;
  /** Cumulative ms at the end of each of the 13 turns. */
  splits: number[];
  /** Filled in once the solver analysis has run. */
  loss?: number;
  rating?: number;
};
```

Personal best, gold splits and sum of best are derived from the stored matches
per category; nothing extra is stored.

The run keeps a raw event log instead of graded `QuizStep`s: grading needs the
solver table, which must not be on the hot path. After the finish,
`analyzeRun(solver, game)` replays the events through `gradeKeep`/`gradeScore`
and returns the same `QuizStep[]`, so `TrainingSummary`'s pieces can render it.

## Code layout

```
src/games/speedrun/
  config.ts            SPEEDRUN_NAME, SPEEDRUN_EMOJI, TARGET_200, PENALTY_MS_PER_POINT
  types.ts
  run.ts               pure: newRun, applyRoll, applyKeep, applyScore, wertung, splits,
                       entryFor (points + bonus + Wunder rule, no solver)
  dice.ts              DiceSource: random, or seeded per day via seededRandom + reroll()
  par.ts               par(solver, date): the optimal solver's score on the day's dice
  analysis.ts          analyzeRun(solver, game) → QuizStep[]
  records.ts           personalBest, goldSplits, sumOfBest, deltaToPb
  storage.ts           createGameStorage("speedrun", …), one stored game per category
  resume.ts            RunningGame for the home page ("läuft · Zug 5/13 · 0:41")
  distribution.ts      Tagesrun submission + time buckets (mirrors the quiz)
  hooks/useSpeedrun.ts clock (requestAnimationFrame, only the timer re-renders),
                       keyboard, commit/finish, lazy solver load after finish
  components/
    Speedrun.tsx       start / run / finish switch
    StartPanel.tsx
    RunTimer.tsx       timer, delta, split bar
    RunBoard.tsx       compact card + DiceDock
    FinishPanel.tsx    splits table, analysis, distribution, share
  *.test.ts            run, dice (seed reproducibility), records, analysis
src/app/speedrun/page.tsx
supabase/migrations/2026xxxx_speedrun_results.sql
```

`entryFor` pulls the points-and-bonus logic out of `applyScore`'s use of
`solver.analyze` so both training and speedrun can use it without the table;
training keeps working unchanged.

## Backend (Tagesrun only)

A `speedrun_results` table mirroring `quiz_results`: `run_date`, a one-day random
`token`, `time_ms`, `score` and `wertung_ms`. The client computes
`wertung_ms`, because Par comes from the solver table, which the server does not
have. Plausibility checks only: `time_ms` between
10 s and 2 h, `score` between 0 and 375. Two `security definer` functions,
`submit_speedrun_result` and `get_speedrun_distribution`, same date window and
duplicate-token rule as the quiz. Without Supabase env vars the Tagesrun still
works, just without the chart.

## Open questions

1. **Penalty rate** — 1 s per point is a guess. Playtest: a careful optimal
   player (≈ 240 points) and a fast careless one (≈ 170) should land within
   ~20 % of each other in the 200er.
2. **Par for random runs** — the 200er uses a fixed 200 because random dice
   have no Par. Alternative: compute the solver's score on the run's own dice
   afterwards and penalise below that ("luck-adjusted"). More fair, but the
   result is unknown until after the finish.
3. **Dice-roll time** — should the first roll of each turn be automatic (one tap
   fewer per turn, 13 taps per run)? Faster and less tedious, but removes the
   "Würfeln" rhythm; could be a setting.
4. **Seeded practice** — allow replaying past days' seeds from an archive (like
   the quiz archive), unranked?
