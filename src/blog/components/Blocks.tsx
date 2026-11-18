import { Lightbulb } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The building blocks of a blog article (Canvas „Kniffel-Guide“). Server
 * components without state: an article is markup plus these.
 */

export const H2 = ({ children }: { children: ReactNode }) => <h2 className="wkx-h2">{children}</h2>;
export const H3 = ({ children }: { children: ReactNode }) => <h3 className="wkx-h3">{children}</h3>;
export const P = ({ children }: { children: ReactNode }) => <p className="wkx-p">{children}</p>;
export const Caption = ({ children }: { children: ReactNode }) => <p className="wk-caption">{children}</p>;

export function List({ children, ordered = false }: { children: ReactNode; ordered?: boolean }) {
  return ordered ? <ol className="wkx-list">{children}</ol> : <ul className="wkx-list">{children}</ul>;
}

/** A link inside the text, to the app or another chapter. */
export const A = ({ href, children }: { href: string; children: ReactNode }) =>
  href.startsWith("/") ? (
    <Link href={href}>{children}</Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );

/** The green band with a bulb: the one sentence to remember. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="wkx-callout">
      <Lightbulb className="size-5" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

// Pip centres on a 24×24 face, as in the quiz's Die.
const L = 6.5;
const M = 12;
const R = 17.5;
const PIPS: Record<number, [number, number][]> = {
  1: [[M, M]],
  2: [[L, L], [R, R]],
  3: [[L, L], [M, M], [R, R]],
  4: [[L, L], [R, L], [L, R], [R, R]],
  5: [[L, L], [R, L], [M, M], [L, R], [R, R]],
  6: [[L, L], [L, M], [L, R], [R, L], [R, M], [R, R]],
};

/**
 * Five small dice; `held` marks the ones to keep. Written as a string of
 * faces ("66661") and a mask of the same length ("11110").
 */
export function MiniDice({ dice, held = "" }: { dice: string; held?: string }) {
  const values = [...dice].map(Number);
  const kept = values.filter((_, i) => held[i] === "1");
  const label = kept.length
    ? `Wurf ${values.join(" ")}, behalten: ${kept.join(" ")}`
    : `Wurf ${values.join(" ")}`;
  return (
    <span className="wkx-gdice" role="img" aria-label={label}>
      {values.map((v, i) => (
        <span key={i} className={cn("wkx-gdie", held[i] === "1" && "is-held")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {PIPS[v].map(([cx, cy], j) => (
              <circle key={j} cx={cx} cy={cy} r="2.4" fill="currentColor" />
            ))}
          </svg>
        </span>
      ))}
    </span>
  );
}

export type Example = {
  dice: string;
  held: string;
  /** "+24,6" or "−0,4". */
  gain?: string;
  title: string;
  alt?: string;
};

/** Rolls with the best keep marked, the gain on the right. */
export function Examples({
  items,
  title = "Wurf und bester Halt",
  gainLabel = "Gewinn",
}: {
  items: Example[];
  title?: string;
  /** Null for examples without numbers. */
  gainLabel?: string | null;
}) {
  return (
    <div className="wk-section">
      <div className="flex items-baseline justify-between">
        <span className="wk-overline">{title}</span>
        {gainLabel && <span className="wk-caption">{gainLabel}</span>}
      </div>
      <div className="wkx-examples">
        {items.map((e) => (
          <div key={e.dice + e.held} className="wkx-ex">
            <div className="wkx-ex-top">
              <MiniDice dice={e.dice} held={e.held} />
              {e.gain && <span className={cn("wkx-ex-gain", e.gain.startsWith("−") && "is-neg")}>{e.gain}</span>}
            </div>
            <p className="wkx-ex-title">{e.title}</p>
            {e.alt && <p className="wkx-ex-alt">{e.alt}</p>}
          </div>
        ))}
      </div>
      <Caption>Grün: die Würfel, die du behältst.</Caption>
    </div>
  );
}

export type Cell = ReactNode | { v: ReactNode; best?: boolean; num?: boolean };

const isCellObject = (c: Cell): c is { v: ReactNode; best?: boolean; num?: boolean } =>
  typeof c === "object" && c !== null && "v" in c;

/** A data table in a scrolling box. Columns listed in `numeric` align right. */
export function Table({
  head,
  rows,
  numeric = [],
}: {
  head: string[];
  rows: Cell[][];
  numeric?: number[];
}) {
  const cls = (i: number, best?: boolean) => cn(numeric.includes(i) && "num", best && "best");
  return (
    <div className="wkx-table-wrap">
      <table className="wkx-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={cls(i)}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((c, i) =>
                isCellObject(c) ? (
                  <td key={i} className={cn(cls(i, c.best), c.num && "num")}>
                    {c.v}
                  </td>
                ) : (
                  <td key={i} className={cls(i)}>
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Horizontal bars from 0, the step to `key` in green, the gain to the row above on the right. */
export function Bars({
  rows,
  max,
  keyIndex,
  label,
}: {
  rows: { label: string; value: number }[];
  max: number;
  keyIndex?: number;
  label: string;
}) {
  return (
    <div className="wkx-bars" role="img" aria-label={label}>
      {rows.map((row, i) => (
        <div key={row.label} className={cn("wkx-bar", i === keyIndex && "is-key")}>
          <span>{row.label}</span>
          <span className="wkx-bar-track">
            <i style={{ width: `${((row.value / max) * 100).toFixed(1)}%` }} />
          </span>
          <b>{de1(row.value)}</b>
          <small>{i === 0 ? "" : `+${de1(row.value - rows[i - 1].value)}`}</small>
        </div>
      ))}
    </div>
  );
}

/** Final scores by percentile, the median filled. */
export function Percentiles({ items, label }: { items: [string, number][]; label: string }) {
  return (
    <div className="wkx-pct" role="img" aria-label={label}>
      {items.map(([p, v]) => (
        <div key={p} className={p === "50 %" ? "is-mid" : undefined}>
          <b>{v}</b>
          <span>{p}</span>
        </div>
      ))}
    </div>
  );
}

/** Numbered rules as cards. */
export function Rules({ items }: { items: { title: string; text: ReactNode }[] }) {
  return (
    <ol className="wkx-rules">
      {items.map((r, i) => (
        <li key={r.title} className="wkx-rule">
          <span className="wkx-rule-num">{i + 1}</span>
          <div>
            <h3>{r.title}</h3>
            <p>{r.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Three key figures in a StatStrip. */
export function Stats({ items }: { items: [string, string][] }) {
  return (
    <div className="wk-stats">
      {items.map(([value, label]) => (
        <div key={label} className="wk-stat">
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

/** A card that sends the reader to practise in the app. */
export function PracticeCard({ title = "Selbst ausprobieren", children }: { title?: string; children: ReactNode }) {
  return (
    <section className="wk-card">
      <h2 className="wk-card-title">{title}</h2>
      <p className="m-0 text-base leading-6 text-ink-muted">{children}</p>
      <Link className="wk-btn wk-btn-primary wk-btn-block" href="/training">
        Training starten
      </Link>
    </section>
  );
}
