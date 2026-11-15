"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  left?: ReactNode;
  backHref?: string;
  title?: string;
  /** At most two actions (design system: PageHeader). Hell/Dunkel and Vollbild live in the game menu and on /konto. */
  right?: ReactNode;
}

export function PageHeader({ left, backHref, title, right }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background px-4 py-4 md:px-8">
      {left ?? (
        <Link
          href={backHref ?? "/"}
          className="flex min-w-0 items-center gap-2 text-ink"
          title={title}
        >
          <ArrowLeft className="shrink-0" size={20} />
          <h1 className="truncate font-display text-2xl leading-8 font-extrabold tracking-tight">
            {title}
          </h1>
        </Link>
      )}
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
