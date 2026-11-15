"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/** Seconds counted down before the run starts. */
export const COUNTDOWN_FROM = 3;
const STEP_MS = 1000;

type CountdownProps = {
  onDone: () => void;
  onCancel: () => void;
};

/**
 * 3 – 2 – 1 before a run, so nobody starts with a hand still off the screen.
 * The run's clock only starts when this calls `onDone`. Escape cancels.
 */
export function Countdown({ onDone, onCancel }: CountdownProps) {
  const [left, setLeft] = useState(COUNTDOWN_FROM);
  // A re-render with a new callback must not restart the current second.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timer = window.setTimeout(() => (left > 1 ? setLeft(left - 1) : done.current()), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [left]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col items-center justify-center gap-8 px-4">
      <span className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Gleich geht&apos;s los</span>
      <span
        key={left}
        role="timer"
        aria-live="assertive"
        className="wk-countdown text-[9rem] leading-none font-black tabular-nums"
      >
        {left}
      </span>
      <Button variant="ghost" className="text-muted-foreground" onClick={onCancel}>
        Abbrechen
      </Button>
    </div>
  );
}
