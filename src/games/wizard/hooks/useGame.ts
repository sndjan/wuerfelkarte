import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EMOJI_OPTIONS } from "@/games/shared/types";
import {
  StoredWizardMatch,
  WizardGame,
  WizardGamemodeKey,
  WizardPlayer,
  WizardWolke,
} from "../types";
import {
  createRound,
  createWizardGame,
  deckSize,
  exactBidCount,
  isGameFinished,
  minAllowedRounds,
  roundsPlayedBy,
  suggestedRounds,
  totalScore,
  wolkeDeltaOptions,
} from "../scoring";
import { ALL_SPECIAL_CARDS } from "../specialCards";
import { wizardGamemodes } from "../gamemodes";
import { wizardStorage } from "../storage";

const FALLBACK_PLAYER_COUNT = 4;

const freeEmoji = (players: WizardPlayer[]) =>
  EMOJI_OPTIONS.find((o) => !players.some((p) => p.emoji === o)) ??
  EMOJI_OPTIONS[0];

function buildMatch(game: WizardGame): StoredWizardMatch | null {
  if (game.players.length === 0) return null;
  return {
    id: game.id,
    gamemode: game.gamemode,
    plusMinusOne: game.plusMinusOne,
    specialCards: game.specialCards ?? [],
    totalRounds: game.totalRounds,
    timestamp: new Date().toISOString(),
    durationMs:
      game.startedAt != null && game.finishedAt != null
        ? game.finishedAt - game.startedAt
        : undefined,
    players: game.players.map((p) => ({
      name: p.name,
      emoji: p.emoji,
      score: totalScore(game, p.id),
      exactBids: exactBidCount(game, p.id),
      roundsPlayed: roundsPlayedBy(game, p.id),
    })),
  };
}

/**
 * Placeholder for a page opened without a game in storage — the lobby is what
 * normally creates games, so this only ever renders the "no players" state.
 */
const emptyGame = (gamemode: WizardGamemodeKey): WizardGame => {
  const cards = wizardGamemodes[gamemode].usesSpecialCards
    ? ALL_SPECIAL_CARDS
    : [];
  return createWizardGame(
    [],
    suggestedRounds(FALLBACK_PLAYER_COUNT, deckSize(cards)),
    gamemode,
    false,
    cards,
  );
};

export function useGame(gamemode: WizardGamemodeKey) {
  const [game, setGame] = useState<WizardGame>(() => {
    const stored = wizardStorage.loadGame();
    if (stored && stored.gamemode === gamemode) return stored;
    return emptyGame(gamemode);
  });

  const hasSavedFinish = useRef(false);

  useEffect(() => {
    wizardStorage.saveGame(game);
  }, [game]);

  // A finished game is recorded exactly once, the moment it becomes finished.
  useEffect(() => {
    if (!isGameFinished(game) || hasSavedFinish.current) return;
    hasSavedFinish.current = true;
    const match = buildMatch(game);
    if (match) wizardStorage.saveMatch(match);
  }, [game]);

  // Every mutation runs through here so `finishedAt` always tracks
  // `isGameFinished` — including flipping back to null when a correction
  // un-finishes a game that had already been scored.
  const updateGame = (updater: (prev: WizardGame) => WizardGame) => {
    setGame((prev) => {
      const next = updater(prev);
      const finished = isGameFinished(next);
      return {
        ...next,
        finishedAt: finished ? (next.finishedAt ?? Date.now()) : null,
      };
    });
  };

  const setRoundCount = (nextTotal: number) => {
    updateGame((prev) => {
      const clamped = Math.max(minAllowedRounds(prev), Math.max(1, nextTotal));
      const rounds =
        clamped > prev.rounds.length
          ? [
              ...prev.rounds,
              ...Array.from({ length: clamped - prev.rounds.length }, () =>
                createRound(prev.players),
              ),
            ]
          : prev.rounds.slice(0, clamped);
      return {
        ...prev,
        totalRounds: clamped,
        rounds,
      };
    });
  };

  const setBid = (roundIndex: number, playerId: string, value: number | null) => {
    updateGame((prev) => ({
      ...prev,
      startedAt: prev.startedAt ?? Date.now(),
      rounds: prev.rounds.map((round, index) => {
        if (index !== roundIndex) return round;
        const next = {
          ...round,
          bids: { ...round.bids, [playerId]: value },
        };
        // A ±1 that would push the bid below 0 or above the round's card count
        // flips to the only shift that still makes sense.
        if (next.wolke?.playerId === playerId) {
          const allowed = wolkeDeltaOptions(next, playerId, roundIndex);
          if (!allowed.includes(next.wolke.delta) && allowed.length > 0) {
            next.wolke = { ...next.wolke, delta: allowed[0] };
          }
        }
        return next;
      }),
    }));
  };

  const setTricks = (
    roundIndex: number,
    playerId: string,
    value: number | null,
  ) => {
    updateGame((prev) => ({
      ...prev,
      startedAt: prev.startedAt ?? Date.now(),
      rounds: prev.rounds.map((round, index) =>
        index === roundIndex
          ? { ...round, tricks: { ...round.tricks, [playerId]: value } }
          : round,
      ),
    }));
  };

  /** Marks the round's trick that contained the Bombe — it belongs to nobody. */
  const setBombTrick = (roundIndex: number, value: boolean) => {
    updateGame((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round, index) =>
        index === roundIndex ? { ...round, bombTrick: value } : round,
      ),
    }));
  };

  /** `null` clears the Wolke: nobody ended the round holding it. */
  const setWolke = (roundIndex: number, wolke: WizardWolke | null) => {
    updateGame((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round, index) =>
        index === roundIndex ? { ...round, wolke } : round,
      ),
    }));
  };

  const addPlayer = (name: string, emoji?: string, recalcRounds?: number) => {
    updateGame((prev) => {
      const player: WizardPlayer = {
        id: crypto.randomUUID(),
        name,
        emoji: emoji ?? freeEmoji(prev.players),
      };
      const players = [...prev.players, player];
      const rounds = prev.rounds.map((round) => ({
        ...round,
        bids: { ...round.bids, [player.id]: null },
        tricks: { ...round.tricks, [player.id]: null },
      }));
      const totalRounds = Math.max(
        recalcRounds ?? prev.totalRounds,
        minAllowedRounds({ ...prev, rounds }),
      );
      const finalRounds =
        totalRounds > rounds.length
          ? [
              ...rounds,
              ...Array.from({ length: totalRounds - rounds.length }, () =>
                createRound(players),
              ),
            ]
          : rounds.slice(0, totalRounds);
      toast.success("Spieler hinzugefügt", {
        description: `${name.trim()} wurde zum Spiel hinzugefügt.`,
      });
      return {
        ...prev,
        players,
        rounds: finalRounds,
        totalRounds: finalRounds.length,
      };
    });
  };

  const removePlayer = (playerId: string, recalcRounds?: number) => {
    updateGame((prev) => {
      const players = prev.players.filter((p) => p.id !== playerId);
      const rounds = prev.rounds.map((round) => {
        const bids = { ...round.bids };
        const tricks = { ...round.tricks };
        delete bids[playerId];
        delete tricks[playerId];
        return {
          ...round,
          bids,
          tricks,
          // A Wolke pointing at the removed player would score nobody.
          wolke: round.wolke?.playerId === playerId ? null : round.wolke,
        };
      });
      const totalRounds = Math.max(
        recalcRounds ?? prev.totalRounds,
        minAllowedRounds({ ...prev, rounds }),
      );
      const finalRounds =
        totalRounds > rounds.length
          ? [
              ...rounds,
              ...Array.from({ length: totalRounds - rounds.length }, () =>
                createRound(players),
              ),
            ]
          : rounds.slice(0, totalRounds);
      toast.success("Spieler entfernt", {
        description: `Ein Spieler wurde aus dem Spiel entfernt.`,
      });
      return {
        ...prev,
        players,
        rounds: finalRounds,
        totalRounds: finalRounds.length,
      };
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
    wizardStorage.clearGame();
    hasSavedFinish.current = false;
    setGame(emptyGame(gamemode));
  };

  // Keeps players, mode and round count — only the entered bids/tricks and
  // the timer are cleared, so a game can be replayed without re-seating.
  const resetRounds = () => {
    hasSavedFinish.current = false;
    updateGame((prev) => ({
      ...prev,
      id: crypto.randomUUID(),
      rounds: Array.from({ length: prev.totalRounds }, () =>
        createRound(prev.players),
      ),
      startedAt: null,
      finishedAt: null,
    }));
  };

  return {
    game,
    setRoundCount,
    setBid,
    setTricks,
    setBombTrick,
    setWolke,
    addPlayer,
    removePlayer,
    changeName,
    resetAll,
    resetRounds,
  };
}
