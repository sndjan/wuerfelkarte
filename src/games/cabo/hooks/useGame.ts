import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EMOJI_OPTIONS } from "@/games/shared/types";
import {
  CaboGame,
  CaboGamemodeKey,
  CaboPlayer,
  CaboRoundEntry,
  StoredCaboMatch,
} from "../types";
import {
  DEFAULT_TARGET_SCORE,
  SPECIAL_HAND_SUM,
  caboCallCount,
  clampTargetScore,
  createCaboGame,
  createRound,
  emptyEntry,
  isRoundComplete,
  minAllowedRounds,
  roundsPlayedBy,
  roundsWonBy,
  totalScore,
} from "../scoring";
import { caboStorage } from "../storage";

const freeEmoji = (players: CaboPlayer[]) =>
  EMOJI_OPTIONS.find((o) => !players.some((p) => p.emoji === o)) ??
  EMOJI_OPTIONS[0];

function buildMatch(game: CaboGame): StoredCaboMatch | null {
  if (game.players.length === 0) return null;
  return {
    id: game.id,
    gamemode: game.gamemode,
    targetScore: game.targetScore,
    totalRounds: game.rounds.length,
    timestamp: new Date(game.finishedAt ?? Date.now()).toISOString(),
    durationMs:
      game.startedAt != null && game.finishedAt != null
        ? game.finishedAt - game.startedAt
        : undefined,
    players: game.players.map((p) => ({
      name: p.name,
      emoji: p.emoji,
      score: totalScore(game, p.id),
      roundsPlayed: roundsPlayedBy(game, p.id),
      roundsWon: roundsWonBy(game, p.id),
      caboCalls: caboCallCount(game, p.id),
    })),
  };
}

/**
 * Placeholder for a page opened without a game in storage — the lobby is what
 * normally creates games, so this only ever renders the "no players" state.
 */
const emptyGame = (gamemode: CaboGamemodeKey): CaboGame =>
  createCaboGame([], DEFAULT_TARGET_SCORE, gamemode);

export function useGame(gamemode: CaboGamemodeKey) {
  const [game, setGame] = useState<CaboGame>(() => {
    const stored = caboStorage.loadGame();
    if (stored && stored.gamemode === gamemode) return stored;
    return emptyGame(gamemode);
  });

  useEffect(() => {
    caboStorage.saveGame(game);
  }, [game]);

  // A finished game is mirrored into the history on every change, so late
  // corrections land in the statistics instead of leaving a stale result.
  useEffect(() => {
    if (game.finishedAt == null) return;
    const match = buildMatch(game);
    if (match) caboStorage.saveMatch(match);
  }, [game]);

  const updateGame = (updater: (prev: CaboGame) => CaboGame) =>
    setGame((prev) => updater(prev));

  /** Every entry edit starts the clock — the first typed number is the kick-off. */
  const patchEntry = (
    roundIndex: number,
    playerId: string,
    patch: Partial<CaboRoundEntry>,
    /** Clears the flag on every other player — Cabo call and special hand can only happen once per round. */
    exclusiveFlag?: "calledCabo" | "specialHand",
  ) => {
    updateGame((prev) => ({
      ...prev,
      startedAt: prev.startedAt ?? Date.now(),
      rounds: prev.rounds.map((round, index) => {
        if (index !== roundIndex) return round;
        const current = round.entries[playerId] ?? emptyEntry();
        const next: CaboRoundEntry = { ...current, ...patch, absent: false };
        const entries =
          exclusiveFlag && patch[exclusiveFlag] === true
            ? Object.fromEntries(
                Object.entries(round.entries).map(([id, entry]) => [
                  id,
                  id === playerId ? next : { ...entry, [exclusiveFlag]: false },
                ]),
              )
            : { ...round.entries, [playerId]: next };
        return { ...round, entries };
      }),
    }));
  };

  const setCardSum = (roundIndex: number, playerId: string, value: number | null) =>
    patchEntry(roundIndex, playerId, { cardSum: value, specialHand: false });

  const setCalledCabo = (roundIndex: number, playerId: string, called: boolean) =>
    patchEntry(roundIndex, playerId, { calledCabo: called }, "calledCabo");

  /** The fixed 12-12-13-13 sum is filled in for them — nothing left to type. */
  const setSpecialHand = (roundIndex: number, playerId: string, special: boolean) =>
    patchEntry(
      roundIndex,
      playerId,
      special ? { specialHand: true, cardSum: SPECIAL_HAND_SUM } : { specialHand: false },
      "specialHand",
    );

  /** Appends an empty round; used by "Runde abschließen" on the last round. */
  const addRound = () =>
    updateGame((prev) => ({
      ...prev,
      finishedAt: null,
      rounds: [...prev.rounds, createRound(prev.players)],
    }));

  /** The group confirmed the target prompt — the partie is over. */
  const finishGame = () =>
    updateGame((prev) => ({
      ...prev,
      // A trailing untouched round would show up as an empty column in the history.
      rounds:
        prev.rounds.length > minAllowedRounds(prev)
          ? prev.rounds.slice(0, minAllowedRounds(prev))
          : prev.rounds,
      startedAt: prev.startedAt ?? Date.now(),
      finishedAt: Date.now(),
    }));

  /** Keeps playing past a finish — the recorded result is withdrawn again. */
  const resumeGame = () => {
    caboStorage.removeMatch(game.id);
    updateGame((prev) => ({
      ...prev,
      finishedAt: null,
      rounds: [...prev.rounds, createRound(prev.players)],
    }));
  };

  const setTargetScore = (next: number) =>
    updateGame((prev) => ({ ...prev, targetScore: clampTargetScore(next) }));

  const addPlayer = (name: string, emoji?: string) => {
    updateGame((prev) => {
      const player: CaboPlayer = {
        id: crypto.randomUUID(),
        name,
        emoji: emoji ?? freeEmoji(prev.players),
      };
      const players = [...prev.players, player];
      const rounds = prev.rounds.map((round) => ({
        ...round,
        // Rounds already played out never applied to the newcomer, so they
        // stay out of both the completeness check and the statistics.
        entries: {
          ...round.entries,
          [player.id]: isRoundComplete(round, prev.players)
            ? { cardSum: null, calledCabo: false, specialHand: false, absent: true }
            : emptyEntry(),
        },
      }));
      toast.success("Spieler hinzugefügt", {
        description: `${name.trim()} wurde zum Spiel hinzugefügt.`,
      });
      return { ...prev, players, rounds };
    });
  };

  const removePlayer = (playerId: string) => {
    updateGame((prev) => {
      const players = prev.players.filter((p) => p.id !== playerId);
      const rounds = prev.rounds.map((round) => {
        const entries = { ...round.entries };
        delete entries[playerId];
        return { ...round, entries };
      });
      toast.success("Spieler entfernt", {
        description: "Ein Spieler wurde aus dem Spiel entfernt.",
      });
      return { ...prev, players, rounds };
    });
  };

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
    caboStorage.clearGame();
    setGame(emptyGame(gamemode));
  };

  // Keeps players, mode and target — only the entered rounds and the timer are
  // cleared, so a group can replay without re-seating. The fresh id makes the
  // replay its own match instead of overwriting the one just recorded.
  const resetRounds = () =>
    updateGame((prev) => ({
      ...prev,
      id: crypto.randomUUID(),
      rounds: [createRound(prev.players)],
      startedAt: null,
      finishedAt: null,
    }));

  return {
    game,
    setCardSum,
    setCalledCabo,
    setSpecialHand,
    addRound,
    finishGame,
    resumeGame,
    setTargetScore,
    addPlayer,
    removePlayer,
    changeName,
    resetAll,
    resetRounds,
  };
}
