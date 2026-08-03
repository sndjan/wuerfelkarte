import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EMOJI_OPTIONS } from "@/games/shared/types";
import {
  Flip7Game,
  Flip7GamemodeKey,
  Flip7Player,
  Flip7RoundEntry,
  StoredFlip7Match,
} from "../types";
import {
  DEFAULT_TARGET_SCORE,
  absentEntry,
  bestRoundScore,
  bustCount,
  clampTargetScore,
  createFlip7Game,
  createRound,
  emptyEntry,
  flip7Count,
  isRoundComplete,
  minAllowedRounds,
  roundsPlayedBy,
  totalScore,
} from "../scoring";
import { flip7Storage } from "../storage";

const freeEmoji = (players: Flip7Player[]) =>
  EMOJI_OPTIONS.find((o) => !players.some((p) => p.emoji === o)) ??
  EMOJI_OPTIONS[0];

function buildMatch(game: Flip7Game): StoredFlip7Match | null {
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
      flip7s: flip7Count(game, p.id),
      busts: bustCount(game, p.id),
      bestRound: bestRoundScore(game, p.id),
    })),
  };
}

/**
 * Placeholder for a page opened without a game in storage — the lobby is what
 * normally creates games, so this only ever renders the "no players" state.
 */
const emptyGame = (gamemode: Flip7GamemodeKey): Flip7Game =>
  createFlip7Game([], DEFAULT_TARGET_SCORE, gamemode);

export function useGame(gamemode: Flip7GamemodeKey) {
  const [game, setGame] = useState<Flip7Game>(() => {
    const stored = flip7Storage.loadGame();
    if (stored && stored.gamemode === gamemode) return stored;
    return emptyGame(gamemode);
  });

  useEffect(() => {
    flip7Storage.saveGame(game);
  }, [game]);

  // A finished game is mirrored into the history on every change, so late
  // corrections land in the statistics instead of leaving a stale result.
  useEffect(() => {
    if (game.finishedAt == null) return;
    const match = buildMatch(game);
    if (match) flip7Storage.saveMatch(match);
  }, [game]);

  const updateGame = (updater: (prev: Flip7Game) => Flip7Game) =>
    setGame((prev) => updater(prev));

  /** Every entry edit starts the clock — the first typed number is the kick-off. */
  const patchEntry = (
    roundIndex: number,
    playerId: string,
    patch: Partial<Flip7RoundEntry>,
  ) => {
    updateGame((prev) => ({
      ...prev,
      startedAt: prev.startedAt ?? Date.now(),
      rounds: prev.rounds.map((round, index) => {
        if (index !== roundIndex) return round;
        const current = round.entries[playerId] ?? emptyEntry();
        const next: Flip7RoundEntry = { ...current, ...patch, absent: false };
        // Only one Flip 7 can happen per round — it ends the round instantly.
        const entries =
          patch.flip7 === true
            ? Object.fromEntries(
                Object.entries(round.entries).map(([id, entry]) => [
                  id,
                  id === playerId ? next : { ...entry, flip7: false },
                ]),
              )
            : { ...round.entries, [playerId]: next };
        return { ...round, entries };
      }),
    }));
  };

  /** Points and Flip 7 are answered together in the keypad, so they land together. */
  const setEntry = (
    roundIndex: number,
    playerId: string,
    points: number | null,
    flip7: boolean,
  ) => patchEntry(roundIndex, playerId, { points, flip7, busted: false });

  /** Busting zeroes the round, so any typed points and a Flip 7 go with it. */
  const setBusted = (roundIndex: number, playerId: string, busted: boolean) =>
    patchEntry(
      roundIndex,
      playerId,
      busted ? { busted: true, points: null, flip7: false } : { busted: false },
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
    flip7Storage.removeMatch(game.id);
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
      const player: Flip7Player = {
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
            ? absentEntry()
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
    flip7Storage.clearGame();
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
    setEntry,
    setBusted,
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
