"use client";

/**
 * The mode selector every lobby shows. The border is kept in both states so
 * switching selection never resizes a pill.
 */
export function GamemodePills<K extends string>({
  gamemodes,
  value,
  onChange,
}: {
  gamemodes: Record<K, { name: string }>;
  value: K;
  onChange: (key: K) => void;
}) {
  const entries = Object.entries(gamemodes) as [K, { name: string }][];

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, mode]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={
            value === key
              ? "rounded-full border border-brand-accent bg-brand-accent px-4 py-2 font-semibold text-white"
              : "rounded-full border border-border bg-card px-4 py-2 font-semibold text-foreground"
          }
        >
          {mode.name}
        </button>
      ))}
    </div>
  );
}
