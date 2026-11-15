"use client";

import { Emoji } from "@/components/emoji/Emoji";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { RuleGame, RuleMode } from "@/games/rules";
import { RulesList } from "./Rules";

/**
 * One mode's rules as a screen of its own. Back returns to wherever it was
 * opened from — a lobby or the rules overview; opened directly, to the overview.
 */
export function ModeRules({ game, mode }: { game: RuleGame; mode: RuleMode }) {
  const router = useRouter();
  const [intro, ...rules] = mode.lines;
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/regeln");
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-background px-4 py-4 md:px-8">
        <button type="button" onClick={back} className="flex min-w-0 items-center gap-2 text-ink" aria-label="Zurück">
          <ArrowLeft className="shrink-0" size={20} />
          <h1 className="truncate font-display text-2xl leading-8 font-extrabold tracking-tight">Regeln</h1>
        </button>
      </div>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pb-8 md:px-8">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">
            <Emoji e={game.emoji} />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm text-muted-foreground">{game.name}</span>
            <h2 className="text-2xl leading-tight font-extrabold">{mode.name}</h2>
          </div>
        </div>
        {intro && <p className="text-[17px] leading-relaxed font-semibold">{intro}</p>}
        <RulesList rules={rules} />
        {game.href && (
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <Button asChild className="h-12 rounded-full text-base">
              <Link href={game.href}>
                <Play className="fill-current" />
                {game.name} spielen
              </Link>
            </Button>
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link href="/regeln">Alle Spielregeln</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
