/**
 * Real-shape payloads for every localStorage key the app wrote before the
 * key unification. The migration in `migrations.ts` is tested against these,
 * so they must keep matching what is actually out there in users' browsers —
 * do not "tidy" them.
 *
 * Captured from the pre-refactor code paths:
 * - `lastMatches`          ← Scoring.tsx pushed whole Player objects
 * - `kniffel:player-names` ← useKniffel, both the string and the object shape
 * - `kniffel:roster`       ← playerRosterStorage, with and without selectionOrder
 * - `kniffel:isThemeActive`← useTheme
 * - `chaoswunderSettings`  ← the Yatzy game page
 * - `wizard:lastMatches`   ← wizard/storage (no match id — it pushed)
 * - `flip7:lastMatches`    ← flip7/storage (has a match id — it upserted)
 */

/** The oldest player-name shape: a bare array of names. */
export const LEGACY_PLAYER_NAMES_STRINGS = ["Anna", "Ben", "Cleo"];

/** The current shape: name plus optional emoji. */
export const LEGACY_PLAYER_NAMES_OBJECTS = [
  { name: "Anna", emoji: "🦄" },
  { name: "Ben" },
];

/** Roster entries written before selection order existed. */
export const LEGACY_ROSTER_WITHOUT_ORDER = [
  { id: "r1", name: "Anna", emoji: "🦄", active: true },
  { id: "r2", name: "Ben", emoji: "🐸", active: false },
];

export const LEGACY_ROSTER = [
  { id: "r1", name: "Anna", emoji: "🦄", active: true, selectionOrder: 1 },
  { id: "r2", name: "Ben", emoji: "🐸", active: true, selectionOrder: 2 },
  { id: "r3", name: "Cleo", emoji: "🐼", active: false, selectionOrder: null },
];

/**
 * Yatzy match history. Note it stored the *entire* Player object including the
 * point sheet, and never an id — that is what the migration reshapes.
 */
export const LEGACY_YATZY_MATCHES = [
  {
    players: [
      {
        id: 1738000000000,
        name: "Anna",
        emoji: "🦄",
        points: {
          Einser: 3,
          Zweier: 8,
          Dreier: 12,
          Vierer: 16,
          Fünfer: 10,
          Sechser: 14,
          Dreierpasch: 22,
          Viererpasch: 0,
          "Full House": 25,
          "Kleine Straße": 30,
          "Große Straße": "X",
          Wunder: 50,
          Chance: 21,
        },
        score: 236,
      },
      {
        id: 1738000000001,
        name: "Ben",
        points: {
          Einser: 2,
          Zweier: 6,
          Dreier: 9,
          Vierer: 12,
          Fünfer: 15,
          Sechser: 18,
          Dreierpasch: 18,
          Viererpasch: 24,
          "Full House": 25,
          "Kleine Straße": "X",
          "Große Straße": 40,
          Wunder: 0,
          Chance: 19,
        },
        score: 223,
      },
    ],
    gamemode: "Wunder",
    timestamp: "2026-07-20T19:12:00.000Z",
  },
  {
    players: [
      { id: 1738000000002, name: "Cleo", points: { Chance: 20 }, score: 20 },
    ],
    gamemode: "MiniWunder",
    timestamp: "2026-07-28T20:05:00.000Z",
    durationMs: 754000,
  },
];

export const LEGACY_CHAOS_SETTINGS = {
  missionEveryRound: true,
  balancedMode: false,
};

/** Wizard match history — pushed, so entries carry no id. */
export const LEGACY_WIZARD_MATCHES = [
  {
    players: [
      { name: "Anna", emoji: "🦄", score: 310, exactBids: 8, roundsPlayed: 20 },
      { name: "Ben", emoji: "🐸", score: 180, exactBids: 5, roundsPlayed: 20 },
      { name: "Cleo", score: 90, exactBids: 3, roundsPlayed: 20 },
    ],
    gamemode: "Standard",
    plusMinusOne: false,
    totalRounds: 20,
    timestamp: "2026-08-01T18:40:00.000Z",
    durationMs: 3_120_000,
  },
  {
    players: [
      { name: "Anna", emoji: "🦄", score: 220, exactBids: 6, roundsPlayed: 11 },
      { name: "Ben", emoji: "🐸", score: 240, exactBids: 7, roundsPlayed: 11 },
    ],
    gamemode: "25 Jahre Edition",
    plusMinusOne: true,
    specialCards: ["drache", "fee", "bombe"],
    totalRounds: 11,
    timestamp: "2026-08-02T20:10:00.000Z",
  },
];

/** Flip 7 match history — upserted, so entries already carry an id. */
export const LEGACY_FLIP7_MATCHES = [
  {
    id: "5f0c1e64-1a3d-4c2b-9f11-7a3b9c2d4e55",
    players: [
      {
        name: "Anna",
        emoji: "🦄",
        score: 212,
        roundsPlayed: 9,
        flip7s: 2,
        busts: 3,
        bestRound: 78,
      },
      {
        name: "Ben",
        emoji: "🐸",
        score: 168,
        roundsPlayed: 9,
        flip7s: 0,
        busts: 5,
        bestRound: 55,
      },
    ],
    gamemode: "Standard",
    targetScore: 200,
    totalRounds: 9,
    timestamp: "2026-08-02T21:30:00.000Z",
    durationMs: 1_450_000,
  },
];

export const LEGACY_WIZARD_GAME = {
  gamemode: "Standard",
  plusMinusOne: false,
  specialCards: [],
  players: [
    { id: "w1", name: "Anna", emoji: "🦄" },
    { id: "w2", name: "Ben", emoji: "🐸" },
    { id: "w3", name: "Cleo", emoji: "🐼" },
  ],
  totalRounds: 20,
  rounds: [
    {
      bids: { w1: 1, w2: 0, w3: 0 },
      tricks: { w1: 1, w2: 0, w3: 0 },
      bombTrick: false,
      wolke: null,
    },
    {
      bids: { w1: 1, w2: 1, w3: null },
      tricks: { w1: null, w2: null, w3: null },
      bombTrick: false,
      wolke: null,
    },
  ],
  dealerStart: 0,
  startedAt: 1_754_150_000_000,
  finishedAt: null,
};

/** A Wizard game saved before the Sonderkarten mode existed. */
export const LEGACY_WIZARD_GAME_WITHOUT_SPECIAL_CARDS = {
  ...LEGACY_WIZARD_GAME,
  specialCards: undefined as unknown as string[],
};

export const LEGACY_FLIP7_GAME = {
  id: "8b21f0aa-77c4-4e1f-9d33-2b4c6f8a1e90",
  gamemode: "Standard",
  targetScore: 200,
  players: [
    { id: "f1", name: "Anna", emoji: "🦄" },
    { id: "f2", name: "Ben", emoji: "🐸" },
    { id: "f3", name: "Cleo", emoji: "🐼" },
  ],
  rounds: [
    {
      entries: {
        f1: { points: 32, busted: false, flip7: false },
        f2: { points: null, busted: true, flip7: false },
        f3: { points: 47, busted: false, flip7: true },
      },
    },
    {
      entries: {
        f1: { points: null, busted: false, flip7: false },
        f2: { points: null, busted: false, flip7: false },
        f3: { points: null, busted: false, flip7: false },
      },
    },
  ],
  startedAt: 1_754_160_000_000,
  finishedAt: null,
};

export const LEGACY_WIZARD_SETTINGS = { hideScores: true };
export const LEGACY_FLIP7_SETTINGS = { hideScores: false, targetScore: 250 };

/** Every legacy key with its payload, ready to seed a fake localStorage. */
export const LEGACY_STORAGE_SNAPSHOT: Record<string, string> = {
  "kniffel:roster": JSON.stringify(LEGACY_ROSTER),
  "kniffel:player-names": JSON.stringify(LEGACY_PLAYER_NAMES_OBJECTS),
  "kniffel:isThemeActive": JSON.stringify(true),
  lastMatches: JSON.stringify(LEGACY_YATZY_MATCHES),
  chaoswunderSettings: JSON.stringify(LEGACY_CHAOS_SETTINGS),
  "wizard:lastMatches": JSON.stringify(LEGACY_WIZARD_MATCHES),
  "wizard:game": JSON.stringify(LEGACY_WIZARD_GAME),
  "wizard:settings": JSON.stringify(LEGACY_WIZARD_SETTINGS),
  "flip7:lastMatches": JSON.stringify(LEGACY_FLIP7_MATCHES),
  "flip7:game": JSON.stringify(LEGACY_FLIP7_GAME),
  "flip7:settings": JSON.stringify(LEGACY_FLIP7_SETTINGS),
};
