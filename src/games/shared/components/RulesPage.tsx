import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/common/PageHeader";
import { ruleGames } from "@/games/rules";

/** Every game and its modes, each leading to the mode's rules screen. */
export function RulesPage() {
  return (
    <div className="min-h-full bg-background">
      <PageHeader backHref="/" title="Spielregeln" />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-10 md:px-8">
        {ruleGames.map((game) => (
          <section key={game.key} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden="true">{game.emoji}</span>
              {game.name}
            </h2>
            <div className="overflow-hidden rounded-2xl border bg-card">
              {game.modes.map((mode) => (
                <Link
                  key={mode.id}
                  href={`/regeln/${game.key}/${mode.slug}`}
                  className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-0 hover:bg-secondary/50"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-bold">{mode.name}</span>
                    {mode.description && (
                      <span className="truncate text-sm text-muted-foreground">{mode.description}</span>
                    )}
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
