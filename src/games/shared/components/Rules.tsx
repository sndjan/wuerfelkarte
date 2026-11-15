import { BookOpen } from "lucide-react";
import Link from "next/link";

import { rulesHref } from "@/games/rules";

/** "Regeln" under a lobby's mode picker: opens the selected mode's rules screen. */
export function RulesLink({ game, mode }: { game: string; mode: string }) {
  return (
    <Link
      href={rulesHref(game, mode)}
      className="flex items-center gap-1.5 self-start text-sm font-semibold text-brand-accent"
    >
      <BookOpen className="size-3.5" aria-hidden="true" />
      Regeln
    </Link>
  );
}

/** Rule lines as a list; the "• " the texts carry becomes the list's own bullet. */
export function RulesList({ rules }: { rules: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rules.map((rule, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="text-brand-accent" aria-hidden="true">
            •
          </span>
          <span>{rule.replace(/^•\s*/, "")}</span>
        </li>
      ))}
    </ul>
  );
}
