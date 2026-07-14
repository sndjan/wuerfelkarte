import Link from "next/link";
import type { GameEntry } from "./games";

export function GameTile({ game }: { game: GameEntry }) {
  if (game.locked) {
    return (
      <div
        aria-disabled="true"
        className="flex h-[150px] w-full flex-col justify-between rounded-[20px] border-2 border-border bg-card p-5"
      >
        <span className="text-4xl opacity-50">{game.emoji}</span>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">{game.name}</h2>
          <span className="rounded-full bg-brand-badge px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.03em] text-white">
            Bald
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={game.href ?? "#"}
      className="flex h-[150px] w-full flex-col justify-between rounded-[20px] bg-primary p-5 text-primary-foreground"
    >
      <span className="text-4xl">{game.emoji}</span>
      <h2 className="text-base font-bold">{game.name}</h2>
    </Link>
  );
}
