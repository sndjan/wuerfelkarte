"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { GameSummary } from "@/games/registry";
import { POINTS_PERFECT, PUZZLES_PER_DAY, dailyStreak, dateKey, puzzlePoints } from "../puzzles";
import { quizStorage } from "../storage";

type TileState = { streak: number; status: string };

function readTileState(): TileState {
  const today = dateKey();
  const matches = quizStorage.loadMatches();
  const streak = dailyStreak(matches, today);
  const day = quizStorage.loadGame();
  if (day?.date === today && day.finishedAt != null) {
    const total = day.progress.map(puzzlePoints).reduce((a, b) => a + b, 0);
    return { streak, status: `Heute ${total}/${PUZZLES_PER_DAY * POINTS_PERFECT} ✓` };
  }
  return { streak, status: `${PUZZLES_PER_DAY} neue Aufgaben` };
}

/** The quiz's home tile: two columns wide, with the streak on the right. */
export function QuizTile({ game }: { game: GameSummary }) {
  // Read after mount: storage does not exist during the server render.
  const [state, setState] = useState<TileState | null>(null);
  useEffect(() => setState(readTileState()), []);

  return (
    <Link
      href={game.href ?? `/${game.key}`}
      className="col-span-2 flex h-[150px] w-full items-stretch justify-between gap-4 rounded-[20px] bg-primary p-5 text-primary-foreground"
    >
      <div className="flex flex-col justify-between">
        <span className="text-4xl">{game.emoji}</span>
        <div>
          <h2 className="text-base font-bold">{game.name}</h2>
          <p className="text-sm opacity-75">{state?.status ?? "Tagesquiz"}</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center self-start rounded-xl bg-primary-foreground/10 px-3 py-2">
        <span className="text-xl font-extrabold tabular-nums" style={{ fontFamily: "var(--font-baloo)" }}>
          🔥 {state?.streak ?? 0}
        </span>
        <span className="text-[9px] font-extrabold uppercase tracking-[.05em] opacity-75">
          {state?.streak === 1 ? "Tag Serie" : "Tage Serie"}
        </span>
      </div>
    </Link>
  );
}
