import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { RunningGame } from "../resume";

type ResumeGameCardProps = {
  game: RunningGame;
  /** The home page lists several games, so it names the game in the title. */
  showGameName?: boolean;
  /** Small print under the card, e.g. that starting anew replaces this game. */
  hint?: string;
};

/** "Weiterspielen" — the way back into a game the browser lost track of. */
export function ResumeGameCard({ game, showGameName, hint }: ResumeGameCardProps) {
  return (
    <div className="flex flex-col gap-1">
      <Link
        href={game.href}
        className="flex items-center justify-between gap-3 rounded-2xl border-2 border-brand-accent bg-card p-4"
      >
        <span className="text-3xl">{game.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {showGameName ? `${game.gameName} · ${game.modeName}` : game.modeName}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {game.players
              .map((p) => (p.emoji ? `${p.emoji} ${p.name}` : p.name))
              .join(", ")}
          </p>
          <p className="text-sm font-semibold text-brand-accent">{game.progress}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          Weiterspielen
          <ArrowRight className="size-4" />
        </span>
      </Link>
      {hint && <p className="px-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
