import { useEffect, useState } from "react";
import { gamemodes } from "../gamemodes/gamemodes";
import { Player, Points } from "./types";

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

const STORAGE_KEY = "kniffel-players";

const loadPlayersFromStorage = (): Player[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const savePlayersToStorage = (players: Player[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch {
    // Handle storage errors silently
  }
};

function calculateScore(
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

  const addPlayer = (name: string) => {
    setPlayers((prevPlayers) => [
      ...prevPlayers,
      {
        id: Date.now(),
        name,
        points: initialPoints,
        score: calculateScore(initialPoints, gamemode),
      },
    ]);
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
  };

  const changeName = (playerId: number, newName: string) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId ? { ...player, name: newName } : player
      )
    );
  };

  const moveToRight = (playerId: number) => {
    setPlayers((prevPlayers) => {
      const index = prevPlayers.findIndex((player) => player.id === playerId);
      if (index === -1 || index === prevPlayers.length - 1) return prevPlayers;

      const newPlayers = [...prevPlayers];
      const player = newPlayers[index];
      newPlayers.splice(index, 1);
      newPlayers.splice(index + 1, 0, player);
      return newPlayers;
    });
  };

  const moveToLeft = (playerId: number) => {
    setPlayers((prevPlayers) => {
      const index = prevPlayers.findIndex((player) => player.id === playerId);
      if (index <= 0) return prevPlayers;

      const newPlayers = [...prevPlayers];
      const player = newPlayers[index];
      newPlayers.splice(index, 1);
      newPlayers.splice(index - 1, 0, player);
      return newPlayers;
    });
  };

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
