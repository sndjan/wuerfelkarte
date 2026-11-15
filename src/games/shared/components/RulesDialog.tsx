"use client";

import { Info } from "lucide-react";
import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type RulesDialogProps = {
  /** The mode's name, shown as the dialog title. */
  title: string;
  /** The mode's `information`: an intro line, then the rules ("• …"). */
  lines: readonly string[];
};

/** "Regeln anzeigen" under a lobby's mode picker: the selected mode's rules. */
export function RulesDialog({ title, lines }: RulesDialogProps) {
  if (lines.length === 0) return null;
  const [intro, ...rules] = lines;
  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-1.5 self-start text-sm font-semibold text-brand-accent">
        <Info className="size-3.5" />
        Regeln anzeigen
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Regeln: {title}</DialogTitle>
          <DialogDescription>{intro}</DialogDescription>
        </DialogHeader>
        <RulesList rules={rules} />
        <Link href="/regeln" className="text-sm font-semibold text-brand-accent">
          Alle Spielregeln
        </Link>
      </DialogContent>
    </Dialog>
  );
}

/** Rule lines as a list; the "• " the texts carry becomes the list's own bullet. */
export function RulesList({ rules }: { rules: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {rules.map((rule, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="text-brand-accent" aria-hidden="true">
            •
          </span>
          <span>{rule.replace(/^•\s*/, "")}</span>
        </li>
      ))}
    </ul>
  );
}
