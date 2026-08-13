"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DarkModeToggle } from "./DarkModeToggle";
import { FullscreenToggle } from "./FullscreenToggle";

interface PageHeaderProps {
  left?: ReactNode;
  backHref?: string;
  title?: string;
  right?: ReactNode;
}

export function PageHeader({ left, backHref, title, right }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between bg-background px-4 py-4">
      {left ?? (
        <Link
          href={backHref ?? "/"}
          className="flex min-w-0 items-center"
          title={title}
        >
          <ArrowLeft className="mr-2 shrink-0" size={20} />
          <h1 className="truncate text-2xl font-extrabold tracking-tight">
            {title}
          </h1>
        </Link>
      )}
      <div className="flex items-center gap-3">
        <FullscreenToggle />
        <DarkModeToggle />
        {right}
      </div>
    </div>
  );
}
