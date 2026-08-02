import { WizardGame, WizardGamemodeKey, WizardPlayer, WizardRound } from "./types";

/** A Wizard deck has 60 cards, which is what caps the number of rounds. */
export const WIZARD_DECK_SIZE = 60;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

/** 3 players → 20 rounds, 4 → 15, 5 → 12, 6 → 10. */
export const suggestedRounds = (playerCount: number): number =>
  playerCount > 0 ? Math.max(1, Math.floor(WIZARD_DECK_SIZE / playerCount)) : 1;

/** Round 1 is played with one card, round 2 with two, … */
export const cardsInRound = (roundIndex: number): number => roundIndex + 1;

export const roundScore = (
  bid: number | null | undefined,
  tricks: number | null | undefined,
): number | null => {
  if (bid == null || tricks == null) return null;
  return bid === tricks ? 20 + 10 * tricks : -10 * Math.abs(bid - tricks);
};

export const createRound = (players: WizardPlayer[]): WizardRound => ({
  bids: Object.fromEntries(players.map((p) => [p.id, null])),
  tricks: Object.fromEntries(players.map((p) => [p.id, null])),
});

export const createWizardGame = (
  players: WizardPlayer[],
  totalRounds: number,
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
): WizardGame => ({
  gamemode,
  plusMinusOne,
  players,
  totalRounds,
  rounds: Array.from({ length: totalRounds }, () => createRound(players)),
  dealerStart: 0,
  startedAt: null,
  finishedAt: null,
});

export const totalScore = (game: WizardGame, playerId: string): number =>
  game.rounds.reduce(
    (sum, round) =>
      sum + (roundScore(round.bids[playerId], round.tricks[playerId]) ?? 0),
    0,
  );

/** Score after the given round, used for the running totals in the history. */
export const scoreAfterRound = (
  game: WizardGame,
  playerId: string,
  roundIndex: number,
): number =>
  game.rounds
    .slice(0, roundIndex + 1)
    .reduce(
      (sum, round) =>
        sum + (roundScore(round.bids[playerId], round.tricks[playerId]) ?? 0),
      0,
    );

export const exactBidCount = (game: WizardGame, playerId: string): number =>
  game.rounds.filter((round) => {
    const bid = round.bids[playerId];
    const tricks = round.tricks[playerId];
    return bid != null && tricks != null && bid === tricks;
  }).length;

export const roundsPlayedBy = (game: WizardGame, playerId: string): number =>
  game.rounds.filter(
    (round) => round.bids[playerId] != null && round.tricks[playerId] != null,
  ).length;

/** Whoever deals the given round — rotates one seat to the left each round. */
export const dealerIndex = (game: WizardGame, roundIndex: number): number =>
  game.players.length === 0
    ? 0
    : (game.dealerStart + roundIndex) % game.players.length;

/** Bidding starts with the dealer's left neighbour and goes clockwise. */
export const biddingOrder = (
  game: WizardGame,
  roundIndex: number,
): WizardPlayer[] => {
  const count = game.players.length;
  if (count === 0) return [];
  const first = (dealerIndex(game, roundIndex) + 1) % count;
  return Array.from({ length: count }, (_, i) => game.players[(first + i) % count]);
};

const sumEntered = (values: Record<string, number | null>): number =>
  Object.values(values).reduce<number>((sum, v) => sum + (v ?? 0), 0);

export const bidSum = (round: WizardRound) => sumEntered(round.bids);
export const trickSum = (round: WizardRound) => sumEntered(round.tricks);

export const allBidsEntered = (round: WizardRound, players: WizardPlayer[]) =>
  players.every((p) => round.bids[p.id] != null);

export const allTricksEntered = (round: WizardRound, players: WizardPlayer[]) =>
  players.every((p) => round.tricks[p.id] != null);

export const hasAnyEntry = (round: WizardRound) =>
  Object.values(round.bids).some((v) => v != null) ||
  Object.values(round.tricks).some((v) => v != null);

export const isRoundDone = (round: WizardRound, players: WizardPlayer[]) =>
  allBidsEntered(round, players) && allTricksEntered(round, players);

/**
 * Lowest round count the game may be shrunk to: everything already touched
 * stays, so no entered result is ever silently thrown away.
 */
export const minAllowedRounds = (game: WizardGame): number => {
  let last = 0;
  game.rounds.forEach((round, index) => {
    if (hasAnyEntry(round)) last = index + 1;
  });
  return Math.max(1, last);
};

export const isGameFinished = (game: WizardGame): boolean =>
  game.rounds.length >= game.totalRounds &&
  game.rounds
    .slice(0, game.totalRounds)
    .every((round) => isRoundDone(round, game.players));

/** First round that still needs bids/tricks, or the last one if all are done. */
export const firstOpenRound = (game: WizardGame): number => {
  const index = game.rounds.findIndex(
    (round) => !isRoundDone(round, game.players),
  );
  return index === -1 ? Math.max(0, game.totalRounds - 1) : index;
};

/** Standings, highest first — ties keep their current seating order. */
export const standings = (game: WizardGame) =>
  game.players
    .map((player) => ({
      ...player,
      score: totalScore(game, player.id),
    }))
    .sort((a, b) => b.score - a.score);
