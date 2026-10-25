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

/** A die face with large pips — the icon set's pips are too small to read. */
function Face({ value, className }: { value: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {PIPS[value].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.3" fill="currentColor" />
      ))}
    </svg>
  );
}

type DieProps = {
  value: number;
  held?: boolean;
  /** Without a handler the die is shown in the same frame, but not tappable. */
  onToggle?: () => void;
};

export function Die({ value, held = false, onToggle }: DieProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!onToggle}
      aria-pressed={onToggle ? held : undefined}
      aria-label={`${value}${held ? ", gehalten" : ""}`}
      className={cn(
        "flex aspect-square w-full max-w-16 items-center justify-center rounded-xl border-2 p-1 transition-all disabled:cursor-default",
        held
          ? "-translate-y-1 border-brand-accent bg-brand-accent/15 text-brand-accent"
          : "border-border bg-card text-foreground",
      )}
    >
      <Face value={value} className="size-full" />
    </button>
  );
}

/** A small die for lists, e.g. the steps of a finished puzzle. */
export function SmallDie({ value }: { value: number }) {
  return <Face value={value} className="inline-block size-6 text-foreground" />;
}
