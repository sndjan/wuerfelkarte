import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/common/PageHeader";
import { ruleGames } from "@/games/rules";
import { RulesList } from "./RulesDialog";

/** Every game's rules on one page: a jump bar on top, each mode to fold open. */
export function RulesPage() {
  return (
    <div className="min-h-full bg-background">
      <PageHeader backHref="/" title="Spielregeln" />
      <nav aria-label="Spiele" className="flex gap-2 overflow-x-auto px-4 pb-4 md:px-8">
        {ruleGames.map((game) => (
          <a
            key={game.key}
            href={`#${game.key}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-semibold"
          >
            <span aria-hidden="true">{game.emoji}</span>
            {game.name}
          </a>
        ))}
      </nav>
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pb-10 md:px-8">
        {ruleGames.map((game) => (
          <section key={game.key} id={game.key} className="flex scroll-mt-20 flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">
                {game.emoji}
              </span>
              <h2 className="flex-1 text-xl font-bold">{game.name}</h2>
              {game.href && (
                <Link href={game.href} className="text-sm font-semibold text-brand-accent">
                  Spielen
                </Link>
              )}
            </div>
            {game.modes.map((mode) => {
              const [intro, ...rules] = mode.lines;
              return (
                <details
                  key={mode.id}
                  id={mode.id}
                  open={game.modes.length === 1}
                  className="group scroll-mt-20 rounded-2xl border bg-card"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-bold">{mode.name}</span>
                      {mode.description && (
                        <span className="text-sm text-muted-foreground">{mode.description}</span>
                      )}
                    </span>
                    <ChevronDown
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-hairline px-4 py-3">
                    {intro && <p className="text-sm">{intro}</p>}
                    <RulesList rules={rules} />
                  </div>
                </details>
              );
            })}
          </section>
        ))}
      </main>
    </div>
  );
}
