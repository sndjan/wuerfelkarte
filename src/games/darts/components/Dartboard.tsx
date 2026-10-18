"use client";

import { cn } from "@/lib/utils";
import {
  BOARD_LABELS,
  BOARD_SEGMENTS,
  BULL_RINGS,
  BoardTone,
  CENTER,
  R_NUMBERS,
  VIEWBOX,
} from "../board";
import { MISS, dartAriaLabel } from "../scoring";
import { Dart } from "../types";

/** The board's own colours — a dartboard looks the same in either theme. */
const TONE_FILL: Record<BoardTone, string> = {
  dark: "#1b1b17",
  light: "#e8d8b2",
  red: "#c0392b",
  green: "#1b8a4b",
};

/** Surround and number ring, i.e. everything that scores nothing. */
const SURROUND = "#141412";
const NUMBER_COLOR = "#e8d8b2";
const WIRE = "rgba(0,0,0,0.5)";
const HIGHLIGHT = "#f2c230";

const sameDart = (a: Dart, b: Dart) =>
  a.segment === b.segment && a.multiplier === b.multiplier;

type DartboardProps = {
  onThrow: (dart: Dart) => void;
  disabled?: boolean;
  /** Darts of the suggested finish — marked so the route is findable on the board. */
  highlight?: Dart[];
};

/**
 * The clickable board.
 *
 * Every bed is its own wedge, so a click says exactly what was hit: the ring
 * decides the multiplier, the sector the number, and everything outside the
 * double ring — surround, number ring, the page around it — is a miss.
 */
export function Dartboard({ onThrow, disabled = false, highlight = [] }: DartboardProps) {
  const throwDart = (dart: Dart) => {
    if (disabled) return;
    onThrow(dart);
  };

  const segmentProps = (dart: Dart, label: string) => ({
    role: "button" as const,
    tabIndex: disabled ? -1 : 0,
    "aria-label": label,
    "aria-disabled": disabled,
    onClick: () => throwDart(dart),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      throwDart(dart);
    },
    className: cn(
      "outline-none transition-opacity",
      disabled ? "cursor-not-allowed" : "cursor-pointer hover:opacity-70",
      "focus-visible:[stroke:#fff] focus-visible:[stroke-width:3]",
    ),
  });

  const isHighlighted = (dart: Dart) =>
    highlight.some((candidate) => sameDart(candidate, dart));

  return (
    // Sized by whatever its box offers — width on a phone, height next to a
    // full-height column — with the viewBox keeping it square either way.
    <div className="flex h-full w-full justify-center">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="h-full max-h-full w-full max-w-[880px] touch-manipulation select-none"
        aria-label="Dartboard"
      >
        {/* The page around the board counts as a miss, too. */}
        <rect
          width={VIEWBOX}
          height={VIEWBOX}
          fill="none"
          pointerEvents="all"
          {...segmentProps(MISS, dartAriaLabel(MISS))}
        />
        {/* Surround and number ring: nothing here scores. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={R_NUMBERS + 14}
          fill={SURROUND}
          {...segmentProps(MISS, dartAriaLabel(MISS))}
        />

        {BOARD_SEGMENTS.map((segment) => (
          <path
            key={segment.id}
            d={segment.path}
            fill={TONE_FILL[segment.tone]}
            stroke={WIRE}
            strokeWidth={0.75}
            {...segmentProps(segment.dart, dartAriaLabel(segment.dart))}
          />
        ))}

        {BULL_RINGS.map((ring) => (
          <circle
            key={ring.id}
            cx={CENTER}
            cy={CENTER}
            r={ring.radius}
            fill={TONE_FILL[ring.tone]}
            stroke={WIRE}
            strokeWidth={0.75}
            {...segmentProps(ring.dart, dartAriaLabel(ring.dart))}
          />
        ))}

        {/* Highlights are painted last, on top of every bed: drawn on the beds
            themselves, the neighbours painted later would cover half the line. */}
        <g pointerEvents="none" fill="none" stroke={HIGHLIGHT} strokeWidth={3}>
          {BOARD_SEGMENTS.filter((segment) => isHighlighted(segment.dart)).map(
            (segment) => (
              <path key={segment.id} d={segment.path} strokeLinejoin="round" />
            ),
          )}
          {BULL_RINGS.map((ring, index) => {
            if (!isHighlighted(ring.dart)) return null;
            // The 25 is a ring around the 50: outline its inner edge, too.
            const inner = BULL_RINGS[index + 1];
            return (
              <g key={ring.id}>
                <circle cx={CENTER} cy={CENTER} r={ring.radius} />
                {inner && <circle cx={CENTER} cy={CENTER} r={inner.radius} />}
              </g>
            );
          })}
        </g>

        <g pointerEvents="none">
          {BOARD_LABELS.map((label) => (
            <text
              key={label.number}
              x={label.x}
              y={label.y}
              fill={NUMBER_COLOR}
              fontSize={22}
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {label.number}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
