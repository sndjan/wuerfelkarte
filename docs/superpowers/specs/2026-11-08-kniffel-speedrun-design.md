# Kniffel-Speedrun

## Context

Kniffel-Training ([src/games/training/](../../../src/games/training/)) plays a whole
solo game on digital dice and grades every decision against the solver as it is
made. It is built for thinking slowly: each move stops for feedback, a ranking of
the top moves and a "Weiter" tap.

A speedrun mode turns the same solo game into a race: fill all 13 fields as fast
as possible and compare the time against your own personal best and — once a
day, on dice everyone shares — against everyone else.

**The result measures skill, not luck.** The points on the card are not part of
the score: a Kniffel in the first roll is luck, so it must not make a run
better. Instead every decision is graded by the solver, exactly as in training,
and each *expected* point a decision gives away costs time. Expected loss only
depends on what the player did with the dice they got, never on how the dice
fell afterwards, so a careful player on bad dice beats a careless one on good
dice.

Most of the parts exist already:

- Dice, holding and rerolls: the training's `TurnView` / the quiz's `DiceDock` and `Die`.
- Grading: `gradeKeep`, `gradeScore` and the per-step `loss` in
  [src/games/quiz/puzzles.ts](../../../src/games/quiz/puzzles.ts), `trainingStats` and
  `biggestMistakes` in [src/games/training/game.ts](../../../src/games/training/game.ts).
- Fair shared dice: the quiz's `seededRandom` and `reroll(dice, held, faces)`,
  which hands out rerolled faces by sorted slot so everyone keeping the same
  values sees the same dice.
- Anonymous daily distribution: the `quiz_results` table and
  [src/games/quiz/distribution.ts](../../../src/games/quiz/distribution.ts).
- Storage, resume and match history: `createGameStorage`, `RunningGame`.

## Goals

- A new game **Kniffel-Speedrun** (⏱️, route `/speedrun`, folder `src/games/speedrun/`)
  listed in the registry next to Quiz and Training.
- A run is one full solo card (13 turns, tournament rules) against a running clock.
- One number per run, the **Wertungszeit**:

  ```
  strafe   = Σ loss of every decision × 1 s     (expected points given away)
  wertung  = time + strafe
  ```

  The score on the card is shown, but does not count.
- Three categories:
  | Category | Dice | Counts | Ranked against |
  | --- | --- | --- | --- |
  | **Any%** | random | time only | own PB |
  | **Klassisch** (default) | random | time + Strafe | own PB |
  | **Tagesrun** | seeded per day, same for everyone | time + Strafe | own PB + everyone (anonymous) |
- Live splits per turn against the personal best, LiveSplit-style.
- Built for speed: no confirmations, no move-by-move feedback, one tap per
  decision on mobile, full keyboard control on desktop.
- After the finish: the full analysis of the run (which decisions cost how
  much, the better move), reusing the training's summary pieces.

## Non-goals

- No named or global leaderboard, no accounts. Only the Tagesrun's anonymous
  result leaves the browser, the same way as the quiz total.
- No server-side verification of times. The server can replay a Tagesrun's
  decisions and re-grade them, but not its clock; the distribution is for fun.
- No multiplayer race or ghost of another player.
- No Yatzy variants (Wunder+, Mini, …) — tournament rules only, the rules the
  solver table is built for.

## Why expected loss removes luck

Each decision's `loss` is `best.expected − chosen.expected`: the expected final
score of the best move minus that of the chosen move, both computed for the
*same* dice and card. The solver is the referee:

- Rolling a Kniffel does not lower the Strafe; entering it in Chance would raise it.
- Missing a Große Straße after the right keep costs nothing — the decision was
  right, the dice were not.
- Bad dice early on make the rest of the card worse, but every later decision is
  graded against what is still possible on *that* card.

What luck still touches, and how much:

- **The number of decisions** varies a little (a turn that is finished after the
  first roll has one decision, not three). Fewer decisions mean fewer chances to
  lose points and slightly less time. In practice 30–39 decisions per run; the
  effect on Wertungszeit is a few seconds at most. The Tagesrun removes it
  entirely between players, since everyone gets the same dice for the same keeps.
- **How hard the decisions are**: some positions are close calls, some obvious.
  Again, the Tagesrun makes this equal for everyone.

That is why the Tagesrun is the one with a shared distribution: on random dice
the Wertungszeit is fair to within seconds, on the day's dice it is exactly fair.

## Rules of a run

**Timing**

- The clock starts on the first "Würfeln" tap, not on page load. Before that the
  board shows the category, the PB and a large start button.
- The clock stops the moment the 13th field is entered.
- Real time (RTA): the clock is `now − startedAt`. Leaving the tab, locking the
  phone or reloading does not pause it. A reloaded run resumes with the clock
  still running, so reloading is never an advantage — and taking a long break
  to think is paid for by the clock.
- Dice animations are the same length for everyone and short (≤ 200 ms); input
  during an animation is accepted and applies to the final faces. There is an
  option to switch the shake off entirely.

**Strafe**

- 1 second per expected point given away, summed over all decisions, rounded to
  a tenth at the end. A run with every move optimal has no Strafe.
- Any% ignores the Strafe — the pure "how fast can you fill a card" race, kept
  because it is fun and classic. It is the only category where careless play is
  allowed.
- The Strafe is graded **while the run happens** and shown as a running total in
  the header ("Strafe +6,4"), but without saying which move it came from or
  what was better. The player knows a move was off; the lesson comes after the
  finish. (This needs the solver table loaded before the start; see Code.)

One second per point keeps the trade-off honest: thinking 5 seconds longer is
worth it only if the better move is worth more than 5 expected points.

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

The design lives on the Kniffel-Speedrun canvas (Start, Lauf — playable, Ziel,
Lauf am Desktop).

### 1. Start (`/speedrun`)

- Segmented control Any% · Klassisch · Tagesrun (gold dot while today's run is open).
- One line on how the category counts ("Jeder verschenkte Punkt kostet eine
  Sekunde. Die Punkte auf der Karte zählen nicht.").
- Personal best as a large time, broken down as `Zeit + Strafe`, plus sum of
  best splits and the number of runs.
- Recent runs with their Wertungszeit and Strafe.
- Big start button "Würfeln & los" — it is disabled with "Solver lädt…" until
  the table is in.

### 2. Run

- Sticky dark header: running clock, running Strafe, delta to PB, 13-segment
  split bar (gold = fastest-ever turn, green = ahead, orange = behind).
- Compact two-column card with previews on free fields; dice docked at the
  bottom for the thumb; "Würfeln" with dots for rolls left.
- The card's total is shown small, as information only.
- Everything that does not help the next tap is hidden.

### 3. Finish

- Wertungszeit large, `Zeit + Strafe` below it, card points shown as "zählt nicht".
- "Nochmal" and "Teilen" right under the result — the restart loop must be
  instant, it is what speedrunners do most.
- Split table with deltas and gold-split stars.
- Analysis: average move quality, best moves `n / m`, expected points given away
  (= Strafe), biggest mistakes with the better move, each with its seconds.
- Tagesrun adds the anonymous distribution of Wertungszeiten (the quiz's
  `ScoreDistribution` with time buckets) and "besser als n %".
- Share text: `⏱️ Kniffel-Speedrun 8.11. · 1:39,8 (1:27,2 + 12,6) · würfelkarte.com/speedrun`.

### 4. Desktop

Same run screen with the splits in a side panel and keyboard hints on every
field and die.

## Keyboard (desktop)

Keys by physical position (`KeyboardEvent.code`), so they work on QWERTZ and
QWERTY alike:

| Keys | Action |
| --- | --- |
| `1`–`5` | hold / release die 1–5 |
| `Space` | Würfeln (also starts the run) |
| `Q W E R T Z` | Einser … Sechser |
| `A S D F G H J` | Dreierpasch, Viererpasch, Full House, Kl. Straße, Gr. Straße, Kniffel, Chance |
| `Enter` on finish | Nochmal |
| `Esc` | Lauf abbrechen (asks once) |

Each field shows its key as a small hint when a hardware keyboard was used
(first keydown), hidden on touch.

## Splits

A split is the cumulative **Wertungszeit** at the end of a turn: time so far
plus Strafe so far. That way a fast but sloppy turn does not show up green.
Gold splits compare one turn's own Wertungszeit (its time plus its Strafe).

## Data model (`src/games/speedrun/types.ts`)

```ts
export type SpeedrunCategory = "any" | "classic" | "daily";

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
  /** Every graded decision, as in training. */
  steps: QuizStep[];
  /** ms since startedAt at the end of each finished turn. */
  turnEnds: number[];
};

export type StoredSpeedrunMatch = StoredMatch<MatchPlayer> & {
  category: SpeedrunCategory;
  date?: string;
  ranked?: boolean;
  timeMs: number;
  /** Σ loss × 1000, 0 in Any%. */
  strafeMs: number;
  wertungMs: number;
  /** Shown, never ranked. */
  score: number;
  /** Cumulative Wertungszeit ms at the end of each of the 13 turns. */
  splits: number[];
  loss: number;
  decisions: number;
  optimal: number;
};
```

Personal best, gold splits and sum of best are derived from the stored matches
per category; nothing extra is stored.

## Code layout

```
src/games/speedrun/
  config.ts            SPEEDRUN_NAME, SPEEDRUN_EMOJI, STRAFE_MS_PER_POINT
  types.ts
  run.ts               pure: newRun, applyRoll, applyKeep, applyScore, strafe, wertung, splits
  dice.ts              DiceSource: random, or seeded per day via seededRandom + reroll()
  records.ts           personalBest, goldSplits, sumOfBest, deltaToPb
  storage.ts           createGameStorage("speedrun", …), one stored game per category
  resume.ts            RunningGame for the home page ("läuft · Zug 5/13 · 0:41")
  distribution.ts      Tagesrun submission + time buckets (mirrors the quiz)
  hooks/useSpeedrun.ts solver load before start, clock (requestAnimationFrame,
                       only the timer re-renders), keyboard, commit/finish
  components/
    Speedrun.tsx       start / run / finish switch
    StartPanel.tsx
    RunTimer.tsx       clock, Strafe, delta, split bar
    RunBoard.tsx       compact card + DiceDock
    FinishPanel.tsx    splits table, analysis, distribution, share
  *.test.ts            run, dice (seed reproducibility), records, strafe
src/app/speedrun/page.tsx
supabase/migrations/2026xxxx_speedrun_results.sql
```

Grading must not slow down input. `applyKeep`/`applyScore` update the dice and
card synchronously; the matching `gradeKeep`/`gradeScore` call (a few ms with
the table) runs right after the frame is painted and appends its step. The
clock is not affected either way: it is wall time.

## Backend (Tagesrun only)

A `speedrun_results` table mirroring `quiz_results`: `run_date`, a one-day random
`token`, `time_ms`, `strafe_ms` and `wertung_ms` (checked:
`wertung_ms = time_ms + strafe_ms`). Plausibility checks only: `time_ms` between
10 s and 2 h, `strafe_ms` between 0 and 400 s. Two `security definer`
functions, `submit_speedrun_result` and `get_speedrun_distribution`, same date
window and duplicate-token rule as the quiz. Without Supabase env vars the
Tagesrun still works, just without the chart.

## Open questions

1. **Strafe rate** — 1 s per expected point is a starting guess. Playtest: an
   optimal player usually gives away 0–10 points per game, a fast careless one
   40–80. The rate should make "careful" win against "fast and careless", but
   not by minutes.
2. **Live Strafe or only at the end?** Showing the running total tells the player
   a move was off without saying which. Alternative: reveal it only at the
   finish, for suspense — but then there is no way to adjust mid-run.
3. **Dice-roll time** — should the first roll of each turn be automatic (one tap
   fewer per turn)? Faster and less tedious, but removes the "Würfeln" rhythm;
   could be a setting.
4. **Seeded practice** — allow replaying past days' seeds from an archive (like
   the quiz archive), unranked?
