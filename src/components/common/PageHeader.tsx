"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
        <Link href={backHref ?? "/"} className="flex items-center">
          <ArrowLeft className="mr-2" size={20} />
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        </Link>
      )}
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  );
}
