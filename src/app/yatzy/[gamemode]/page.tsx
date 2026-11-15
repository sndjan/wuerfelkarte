"use client";

import { Suspense, useEffect, useState } from "react";

import { Board } from "@/games/yatzy/components/Board";

/**
 * The board reads the running sheet from localStorage while it renders, which
 * the server cannot see; rendering it only in the browser avoids a hydration
 * mismatch (and a flash of the empty default sheet).
 */
export default function YatzyGamePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Suspense>
      <Board />
    </Suspense>
  );
}
