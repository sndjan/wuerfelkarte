import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EMOJI_OPTIONS } from "@/games/shared/types";
import {
  DEFAULT_IN_RULE,
  DEFAULT_LEGS_TO_WIN,
  DEFAULT_OUT_RULE,
  DEFAULT_START_SCORE,
  clampLegsToWin,
  createDartsGame,
  createLeg,
  currentLeg,
  currentLegState,
  isMatchDecided,
  legStateAt,
  playerStats,
  withoutLastDart,
} from "../scoring";
import { dartsStorage } from "../storage";
import {
  Dart,
  DartsGame,
  DartsGamemodeKey,
  DartsPlayer,
  StoredDartsMatch,
} from "../types";

const freeEmoji = (players: DartsPlayer[]) =>
  EMOJI_OPTIONS.find((o) => !players.some((p) => p.emoji === o)) ??
  EMOJI_OPTIONS[0];

function buildMatch(game: DartsGame): StoredDartsMatch | null {
  if (game.players.length === 0) return null;
  return {
    id: game.id,
    gamemode: game.gamemode,
    startScore: game.startScore,
    inRule: game.inRule,
    outRule: game.outRule,
    legsToWin: game.legsToWin,
    totalLegs: game.legs.filter(
      (_, index) => legStateAt(game, index).winnerId !== null,
    ).length,
    timestamp: new Date(game.finishedAt ?? Date.now()).toISOString(),
    durationMs:
      game.startedAt != null && game.finishedAt != null
        ? game.finishedAt - game.startedAt
        : undefined,
    players: game.players.map((player) => {
      const stats = playerStats(game, player.id);
      return {
        name: player.name,
        emoji: player.emoji,
        score: stats.legsWon,
        dartsThrown: stats.dartsThrown,
        pointsScored: stats.pointsScored,
        average: stats.average,
        bestTurn: stats.bestTurn,
        maximums: stats.maximums,
        turns140: stats.turns140,
        turns100: stats.turns100,
        bestLegDarts: stats.bestLegDarts,
      };
    }),
  };
}

/**
 * Placeholder for a page opened without a game in storage — the lobby is what
 * normally creates games, so this only ever renders the "no players" state.
 */
const emptyGame = (gamemode: DartsGamemodeKey): DartsGame =>
  createDartsGame(
    [],
    {
      startScore: DEFAULT_START_SCORE,
      inRule: DEFAULT_IN_RULE,
      outRule: DEFAULT_OUT_RULE,
      legsToWin: DEFAULT_LEGS_TO_WIN,
    },
    gamemode,
  );

export function useGame(gamemode: DartsGamemodeKey) {
  const [game, setGame] = useState<DartsGame>(() => {
    const stored = dartsStorage.loadGame();
    if (stored && stored.gamemode === gamemode) return stored;
    return emptyGame(gamemode);
  });

  useEffect(() => {
    dartsStorage.saveGame(game);
  }, [game]);

  // Reaching the leg target decides the match on its own — unlike a points
  // target there is nothing left to ask, so the clock stops here.
  useEffect(() => {
    if (game.finishedAt != null) return;
    if (!isMatchDecided(game)) return;
    setGame((prev) =>
      prev.finishedAt == null && isMatchDecided(prev)
        ? { ...prev, startedAt: prev.startedAt ?? Date.now(), finishedAt: Date.now() }
        : prev,
    );
  }, [game]);

  // A decided match is mirrored into the history on every change, so a late
  // correction lands in the statistics instead of leaving a stale result.
  useEffect(() => {
    if (game.finishedAt == null) return;
    const match = buildMatch(game);
    if (match) dartsStorage.saveMatch(match);
  }, [game]);

  const updateGame = (updater: (prev: DartsGame) => DartsGame) =>
    setGame((prev) => updater(prev));

  /** Records one dart for whoever is at the oche. */
  const throwDart = (thrown: Dart) =>
    updateGame((prev) => {
      if (prev.finishedAt != null || prev.players.length === 0) return prev;
      const state = currentLegState(prev);
      // A decided leg waits for the dialog; nothing may be thrown into it.
      if (state.winnerId != null || state.currentPlayerId == null) return prev;

      const leg = currentLeg(prev);
      const turns = [...leg.turns];
      if (state.openTurnIndex !== null) {
        const open = turns[state.openTurnIndex];
        turns[state.openTurnIndex] = { ...open, darts: [...open.darts, thrown] };
      } else {
        turns.push({ playerId: state.currentPlayerId, darts: [thrown] });
      }

      return {
        ...prev,
        // The first dart starts the clock.
        startedAt: prev.startedAt ?? Date.now(),
        legs: [...prev.legs.slice(0, -1), { ...leg, turns }],
      };
    });

  /** Steps back one dart, across visit and leg boundaries. */
  const undoLastDart = () => {
    const undone = withoutLastDart(game);
    if (!undone) {
      toast.info("Nichts zum Zurücknehmen");
      return;
    }
    // The recorded result is withdrawn: the match is open again.
    if (game.finishedAt != null) dartsStorage.removeMatch(game.id);
    setGame(undone);
  };

  /** Opens the next leg once the group has seen who took the last one. */
  const startNextLeg = () =>
    updateGame((prev) => {
      if (isMatchDecided(prev)) return prev;
      if (currentLegState(prev).winnerId == null) return prev;
      return {
        ...prev,
        legs: [...prev.legs, createLeg(prev.legs.length, prev.players.length)],
      };
    });

  /**
   * Raising the target past what the winner has taken puts the match back in
   * play — the way to keep going after the trophy has been handed out.
   */
  const setLegsToWin = (value: number) =>
    updateGame((prev) => {
      const legsToWin = clampLegsToWin(value);
      const next = { ...prev, legsToWin };
      if (!isMatchDecided(next) && prev.finishedAt != null) {
        dartsStorage.removeMatch(prev.id);
        return {
          ...next,
          finishedAt: null,
          legs:
            currentLegState(next).winnerId != null
              ? [...next.legs, createLeg(next.legs.length, next.players.length)]
              : next.legs,
        };
      }
      return next;
    });

  const addPlayer = (name: string, emoji?: string) =>
    updateGame((prev) => {
      const player: DartsPlayer = {
        id: crypto.randomUUID(),
        name,
        emoji: emoji ?? freeEmoji(prev.players),
      };
      toast.success("Spieler hinzugefügt", {
        description: `${name.trim()} spielt ab sofort mit und startet auf ${prev.startScore}.`,
      });
      return { ...prev, players: [...prev.players, player] };
    });

  const removePlayer = (playerId: string) =>
    updateGame((prev) => {
      toast.success("Spieler entfernt", {
        description: "Ein Spieler wurde aus dem Spiel entfernt.",
      });
      return {
        ...prev,
        players: prev.players.filter((p) => p.id !== playerId),
        // Their visits go with them, so the legs still add up.
        legs: prev.legs.map((leg) => ({
          ...leg,
          turns: leg.turns.filter((turn) => turn.playerId !== playerId),
        })),
      };
    });

  const changeName = (playerId: string, name: string, emoji?: string) => {
    updateGame((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, name, emoji: emoji ?? p.emoji } : p,
      ),
    }));
    toast.success("Spielername geändert", {
      description: `Der Spielername wurde zu ${name.trim()} geändert.`,
    });
  };

  const resetAll = () => {
    dartsStorage.clearGame();
    setGame(emptyGame(gamemode));
  };

  // Keeps players and settings — only the thrown darts and the timer go. The
  // fresh id makes the rematch its own match instead of overwriting the result.
  const resetLegs = () =>
    updateGame((prev) => ({
      ...prev,
      id: crypto.randomUUID(),
      legs: [createLeg(0, prev.players.length)],
      startedAt: null,
      finishedAt: null,
    }));

  return {
    game,
    throwDart,
    undoLastDart,
    startNextLeg,
    setLegsToWin,
    addPlayer,
    removePlayer,
    changeName,
    resetAll,
    resetLegs,
  };
}
