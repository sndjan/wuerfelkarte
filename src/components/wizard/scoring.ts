import {
  WizardGame,
  WizardGamemodeKey,
  WizardPlayer,
  WizardRound,
  WizardSpecialCard,
} from "./types";

/** A Wizard deck has 60 character cards; Sonderkarten are shuffled in on top. */
export const WIZARD_DECK_SIZE = 60;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

/** 60 character cards plus one card per selected Sonderkarte. */
export const deckSize = (specialCards: WizardSpecialCard[] = []): number =>
  WIZARD_DECK_SIZE + specialCards.length;

/** 3 players → 20 rounds, 4 → 15, 5 → 12, 6 → 10 (more with Sonderkarten). */
export const suggestedRounds = (
  playerCount: number,
  cards: number = WIZARD_DECK_SIZE,
): number =>
  playerCount > 0 ? Math.max(1, Math.floor(cards / playerCount)) : 1;

/** Round 1 is played with one card, round 2 with two, … */
export const cardsInRound = (roundIndex: number): number => roundIndex + 1;

export const roundScore = (
  bid: number | null | undefined,
  tricks: number | null | undefined,
): number | null => {
  if (bid == null || tricks == null) return null;
  return bid === tricks ? 20 + 10 * tricks : -10 * Math.abs(bid - tricks);
};

/**
 * The bid a player is actually scored against: the Wolke shifts its holder's
 * prediction by ±1 after the round, while the originally entered bid stays put.
 */
export const effectiveBid = (
  round: WizardRound,
  playerId: string,
): number | null => {
  const bid = round.bids[playerId] ?? null;
  if (bid == null) return null;
  return round.wolke?.playerId === playerId ? bid + round.wolke.delta : bid;
};

export const playerRoundScore = (
  round: WizardRound,
  playerId: string,
): number | null => roundScore(effectiveBid(round, playerId), round.tricks[playerId]);

/** Tricks that can still be won this round — a Bombe trick belongs to nobody. */
export const tricksInRound = (
  round: WizardRound | undefined,
  roundIndex: number,
): number => Math.max(0, cardsInRound(roundIndex) - (round?.bombTrick ? 1 : 0));

/**
 * Which ±1 shifts the Wolke holder may take: the adjusted bid still has to be a
 * number of tricks they could conceivably have made.
 */
export const wolkeDeltaOptions = (
  round: WizardRound,
  playerId: string,
  roundIndex: number,
): Array<1 | -1> => {
  const bid = round.bids[playerId] ?? null;
  if (bid == null) return [-1, 1];
  const max = cardsInRound(roundIndex);
  return ([-1, 1] as Array<1 | -1>).filter(
    (delta) => bid + delta >= 0 && bid + delta <= max,
  );
};

export const createRound = (players: WizardPlayer[]): WizardRound => ({
  bids: Object.fromEntries(players.map((p) => [p.id, null])),
  tricks: Object.fromEntries(players.map((p) => [p.id, null])),
  bombTrick: false,
  wolke: null,
});

export const createWizardGame = (
  players: WizardPlayer[],
  totalRounds: number,
  gamemode: WizardGamemodeKey,
  plusMinusOne: boolean,
  specialCards: WizardSpecialCard[] = [],
): WizardGame => ({
  gamemode,
  plusMinusOne,
  specialCards,
  players,
  totalRounds,
  rounds: Array.from({ length: totalRounds }, () => createRound(players)),
  dealerStart: 0,
  startedAt: null,
  finishedAt: null,
});

export const hasSpecialCard = (
  game: WizardGame,
  card: WizardSpecialCard,
): boolean => (game.specialCards ?? []).includes(card);

export const totalScore = (game: WizardGame, playerId: string): number =>
  game.rounds.reduce(
    (sum, round) => sum + (playerRoundScore(round, playerId) ?? 0),
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
    .reduce((sum, round) => sum + (playerRoundScore(round, playerId) ?? 0), 0);

export const exactBidCount = (game: WizardGame, playerId: string): number =>
  game.rounds.filter((round) => {
    const bid = effectiveBid(round, playerId);
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
  Object.values(round.tricks).some((v) => v != null) ||
  round.bombTrick === true ||
  round.wolke != null;

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
