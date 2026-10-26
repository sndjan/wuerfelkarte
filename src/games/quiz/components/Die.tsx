"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// Pip centres on a 24×24 face.
const L = 7;
const M = 12;
const R = 17;
const PIPS: Record<number, [number, number][]> = {
  1: [[M, M]],
  2: [[L, L], [R, R]],
  3: [[L, L], [M, M], [R, R]],
  4: [[L, L], [R, L], [L, R], [R, R]],
  5: [[L, L], [R, L], [M, M], [L, R], [R, R]],
  6: [[L, L], [R, L], [L, M], [R, M], [L, R], [R, R]],
};

/** How long a roll shakes the dice. */
export const ROLL_MS = 450;

/** A die face with large pips — the icon set's pips are too small to read. */
function Face({ value, className }: { value?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {(value ? PIPS[value] : []).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.3" fill="currentColor" />
      ))}
    </svg>
  );
}

type DieProps = {
  /** Without a value the die is blank: not rolled yet. */
  value?: number;
  held?: boolean;
  /** Shaking and flicking through random faces before showing `value`. */
  rolling?: boolean;
  /** Without a handler the die is shown in the same frame, but not tappable. */
  onToggle?: () => void;
};

const randomFace = () => 1 + Math.floor(Math.random() * 6);

export function Die({ value, held = false, rolling = false, onToggle }: DieProps) {
  const [face, setFace] = useState(randomFace);

  useEffect(() => {
    if (!rolling) return;
    const id = setInterval(() => setFace(randomFace()), 70);
    return () => clearInterval(id);
  }, [rolling]);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!onToggle}
      aria-pressed={onToggle ? held : undefined}
      aria-label={value ? `${value}${held ? ", gehalten" : ""}` : "Noch nicht gewürfelt"}
      className={cn(
        "flex aspect-square w-full max-w-16 items-center justify-center rounded-xl border-2 p-1 transition-all disabled:cursor-default",
        held
          ? "-translate-y-1 border-brand-accent bg-brand-accent/15 text-brand-accent"
          : "border-border bg-card text-foreground",
      )}
    >
      <motion.span
        className="size-full"
        animate={rolling ? { rotate: [0, -14, 12, -8, 6, 0], y: [0, -4, 0, -3, 0, 0] } : { rotate: 0, y: 0 }}
        transition={{ duration: rolling ? ROLL_MS / 1000 : 0.1, ease: "easeInOut" }}
      >
        <Face value={rolling ? face : value} className="size-full" />
      </motion.span>
    </button>
  );
}

/** A small die for lists, e.g. the steps of a finished puzzle. */
export function SmallDie({ value }: { value: number }) {
  return <Face value={value} className="inline-block size-6 text-foreground" />;
}
