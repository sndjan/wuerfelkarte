"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Emoji } from "@/components/emoji/Emoji";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { waitingFor } from "./online/components/ActiveGameCard";
import { useMyOnline } from "./online/hooks/useOnline";
import { POINTS_PERFECT, PUZZLES_PER_DAY, dateKey, puzzlePoints } from "./quiz/puzzles";
import { quizStorage } from "./quiz/storage";
import type { GameSummary } from "./registry";
import { formatTime } from "./speedrun/config";
import { personalBest } from "./speedrun/records";
import { runningSpeedrunGame } from "./speedrun/resume";
import { speedrunStorage } from "./speedrun/storage";
import { runningTrainingGame } from "./training/resume";

/** The one dark tile of the home page: the Würfelkarte score sheet. */
export function HeroTile({ game, className }: { game: GameSummary; className?: string }) {
  return (
    <Link
      href={game.href ?? `/${game.key}`}
      className={cn("wk-tile wk-tile-hero col-span-2 h-32 justify-between md:h-auto", className)}
    >
      <div>
        <span className="wk-tile-emoji md:text-5xl" aria-hidden="true">
          <Emoji e={game.emoji} />
        </span>
        <div>
          <h2 className="wk-tile-title md:text-2xl md:leading-8 md:font-extrabold">{game.name}</h2>
          <p className="wk-tile-sub">Punkteblock für Kniffel, Yahtzee &amp; Co.</p>
        </div>
      </div>
      <ArrowRight className="size-5 self-end" aria-hidden="true" />
    </Link>
  );
}

/** A Würfelkarte mode (Online, Quiz, Training, Speedrun) with one status line. */
export function ModeTile({ game, className }: { game: GameSummary; className?: string }) {
  const status = useModeStatus(game.key);
  return (
    <Link href={game.href ?? `/${game.key}`} className={cn("wk-tile h-32 p-4 md:h-auto md:p-5", className)}>
      <span className="wk-tile-emoji" aria-hidden="true">
        <Emoji e={game.emoji} />
      </span>
      <div className="min-w-0">
        <h2 className="wk-tile-title">{game.name}</h2>
        <p className="wk-tile-sub truncate">{status}</p>
      </div>
    </Link>
  );
}

/** Wizard, Flip 7, Cabo, Darts: one line each. */
export function CompactTile({ game }: { game: GameSummary }) {
  return (
    <Link href={game.href ?? `/${game.key}`} className="wk-tile wk-tile-compact">
      <span className="wk-tile-emoji" aria-hidden="true">
        <Emoji e={game.emoji} />
      </span>
      <h3 className="wk-tile-title">{game.name}</h3>
    </Link>
  );
}

const DEFAULT_STATUS: Record<string, string> = {
  online: "Mit Freunden spielen",
  quiz: `${PUZZLES_PER_DAY} neue Aufgaben`,
  training: "Zug für Zug üben",
  speedrun: "Gegen die Uhr",
};

/** The status line under a mode tile, read from storage after mount. */
function useModeStatus(key: string): string {
  const [status, setStatus] = useState(DEFAULT_STATUS[key] ?? "");
  const online = useOnlineStatus(key === "online");

  useEffect(() => {
    if (key === "quiz") {
      const today = dateKey();
      const day = quizStorage.loadGame();
      if (day?.date === today && day.finishedAt != null) {
        const total = day.progress.map(puzzlePoints).reduce((a, b) => a + b, 0);
        setStatus(`Heute ${total}/${PUZZLES_PER_DAY * POINTS_PERFECT}`);
      }
    } else if (key === "training") {
      const running = runningTrainingGame();
      if (running) setStatus(running.progress);
    } else if (key === "speedrun") {
      const running = runningSpeedrunGame();
      const pb = personalBest(speedrunStorage.loadMatches(), "classic");
      if (running) setStatus("Die Uhr läuft");
      else if (pb) setStatus(`Bestzeit ${formatTime(pb.wertungMs)}`);
    }
  }, [key]);

  return online ?? status;
}

/** "Du bist dran", "Lena ist dran" or an invite count; null when there is nothing to say. */
function useOnlineStatus(enabled: boolean): string | null {
  const { user } = useAuth();
  const online = useMyOnline();
  if (!enabled || !user || online.state !== "ready") return null;
  if (online.active) return waitingFor(online.active, user.id).text;
  if (online.invites.length > 0) {
    return online.invites.length === 1 ? "1 Einladung" : `${online.invites.length} Einladungen`;
  }
  return null;
}
