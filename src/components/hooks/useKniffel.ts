import { useEffect, useState } from "react";
import { gamemodes } from "../gamemodes/gamemodes";
import { syncRosterOrder } from "./playerRosterStorage";
import { Player, Points } from "./types";
import { toast } from "sonner";

const initialPoints = {
  Einser: 0,
  Zweier: 0,
  Dreier: 0,
  Vierer: 0,
  Fünfer: 0,
  Sechser: 0,
  Dreierpasch: 0,
  Viererpasch: 0,
  "Full House": 0,
  "Kleine Straße": 0,
  "Große Straße": 0,
  Wunder: 0,
  Chance: 0,
};

const initialPlayers = [
  {
    id: Date.now(),
    name: "Player 1",
    points: initialPoints,
  },
  {
    id: Date.now() + 1,
    name: "Player 2",
    points: initialPoints,
  },
];

const STORAGE_KEY = "kniffel:player-names";

type StoredPlayer = string | { name: string; emoji?: string };

const loadPlayersFromStorage = (): Player[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const storedPlayers: StoredPlayer[] = JSON.parse(stored);
      return storedPlayers.map((entry, index) => {
        const { name, emoji } =
          typeof entry === "string" ? { name: entry, emoji: undefined } : entry;
        return {
          id: Date.now() + index,
          name,
          emoji,
          points: { ...initialPoints },
          score: 0,
        };
      });
    }
    return null;
  } catch {
    return null;
  }
};

const savePlayersToStorage = (players: Player[]) => {
  try {
    const storedPlayers: StoredPlayer[] = players.map((player) => ({
      name: player.name,
      emoji: player.emoji,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedPlayers));
  } catch {
    // Handle storage errors silently
  }
};

export function calculateScore(
  points: Points,
  gamemode: keyof typeof gamemodes
): number {
  const config = gamemodes[gamemode];
  let bonus = 0;
  let sum = 0;
  if (config?.bonus) {
    sum = config.bonus.fields.reduce(
      (acc, key) =>
        acc +
        (typeof points[key as keyof typeof points] === "number"
          ? (points[key as keyof typeof points] as number)
          : 0),
      0
    );
    if (sum >= config.bonus.minSum) {
      bonus = config.bonus.bonus;
    }
  }
  const totalScore =
    config?.fields.reduce(
      (acc, { key }) =>
        acc +
        (typeof points[key as keyof typeof points] === "number"
          ? (points[key as keyof typeof points] as number)
          : 0),
      0
    ) + bonus;
  return totalScore;
}

export const useKniffel = (gamemode: keyof typeof gamemodes = "Klassiker") => {
  const [players, setPlayers] = useState<Player[]>(() => {
    const storedPlayers = loadPlayersFromStorage();
    if (storedPlayers) {
      return storedPlayers.map((p) => ({
        ...p,
        score: calculateScore(p.points, gamemode),
      }));
    }
    return initialPlayers.map((p) => ({
      ...p,
      score: calculateScore(p.points, gamemode),
    }));
  });

  useEffect(() => {
    savePlayersToStorage(players);
  }, [players]);

  const addPlayer = (name: string, emoji?: string) => {
    setPlayers((prevPlayers) => [
      ...prevPlayers,
      {
        id: Date.now(),
        name,
        emoji,
        points: initialPoints,
        score: calculateScore(initialPoints, gamemode),
      },
    ]);
    toast.success("Spieler hinzugefügt", {
      description: `${name.trim()} wurde zum Spiel hinzugefügt.`,
    });
  };

  const updatePoints = (playerId: number, points: Partial<Points>) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) => {
        if (player.id === playerId) {
          const newPoints = { ...player.points, ...points };
          return {
            ...player,
            points: newPoints,
            score: calculateScore(newPoints, gamemode),
          };
        }
        return player;
      })
    );
  };

  const resetPoints = (playerId?: number) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        playerId === undefined || player.id === playerId
          ? {
              ...player,
              points: initialPoints,
              score: calculateScore(initialPoints, gamemode),
            }
          : player
      )
    );
  };

  const removePlayer = (playerId: number) => {
    setPlayers((prevPlayers) =>
      prevPlayers.filter((player) => player.id !== playerId)
    );
    toast.success("Spieler entfernt", {
      description: `Ein Spieler wurde aus dem Spiel entfernt.`,
    });
  };

  const changeName = (playerId: number, newName: string, emoji?: string) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId
          ? { ...player, name: newName, emoji: emoji ?? player.emoji }
          : player
      )
    );
    toast.success("Spielername geändert", {
      description: `Der Spielername wurde zu ${newName.trim()} geändert.`,
    });
  };

  // Moving a card also rewrites the stored roster order, so the lobby's
  // selection order reflects the seating order the game ended up with.
  const movePlayer = (playerId: number, offset: 1 | -1) => {
    const index = players.findIndex((player) => player.id === playerId);
    const target = index + offset;
    if (index === -1 || target < 0 || target >= players.length) return;

    const newPlayers = [...players];
    const [player] = newPlayers.splice(index, 1);
    newPlayers.splice(target, 0, player);
    setPlayers(newPlayers);
    syncRosterOrder(newPlayers.map((p) => p.name));
  };

  const moveToRight = (playerId: number) => movePlayer(playerId, 1);

  const moveToLeft = (playerId: number) => movePlayer(playerId, -1);

  const resetAllPoints = () => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) => ({
        ...player,
        points: initialPoints,
        score: calculateScore(initialPoints, gamemode),
      }))
    );
  };

  const resetAll = () => {
    setPlayers(
      initialPlayers.map((p) => ({
        ...p,
        score: calculateScore(p.points, gamemode),
      }))
    );
  };

  return {
    players,
    addPlayer,
    updatePoints,
    resetPoints,
    removePlayer,
    changeName,
    moveToRight,
    moveToLeft,
    resetAll,
    resetAllPoints,
  };
};
