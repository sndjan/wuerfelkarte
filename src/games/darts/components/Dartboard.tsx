"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

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
  /** Darts thrown in this leg so far — the next click is dart number `thrown`. */
  thrown?: number;
  /** Where the latest visit starts: its darts stay pinned until the next one begins. */
  visitStart?: number;
};

type Point = { x: number; y: number };

/**
 * The clickable board.
 *
 * Every bed is its own wedge, so a click says exactly what was hit: the ring
 * decides the multiplier, the sector the number, and everything outside the
 * double ring — surround, number ring, the page around it — is a miss.
 */
export function Dartboard({
  onThrow,
  disabled = false,
  highlight = [],
  thrown = 0,
  visitStart = 0,
}: DartboardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Where each dart of the leg landed, by its number in the leg. Only clicks
  // leave a pin — a dart typed in has no spot on the board to show.
  const [pins, setPins] = useState<Record<number, Point>>({});

  // An undone dart takes its pin with it, so a re-throw never shows a stale one.
  useEffect(() => {
    setPins((prev) => {
      const kept = Object.entries(prev).filter(([n]) => Number(n) < thrown);
      return kept.length === Object.keys(prev).length
        ? prev
        : Object.fromEntries(kept);
    });
  }, [thrown]);

  const throwDart = (dart: Dart, event?: React.MouseEvent) => {
    if (disabled) return;
    const matrix = svgRef.current?.getScreenCTM();
    if (event && matrix) {
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );
      setPins((prev) => ({ ...prev, [thrown]: { x: point.x, y: point.y } }));
    }
    onThrow(dart);
  };

  const segmentProps = (dart: Dart, label: string) => ({
    role: "button" as const,
    tabIndex: disabled ? -1 : 0,
    "aria-label": label,
    "aria-disabled": disabled,
    onClick: (event: React.MouseEvent) => throwDart(dart, event),
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
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="h-full max-h-full w-full max-w-[880px] touch-manipulation select-none"
        aria-label="Dartboard"
      >
        <DartDefs />
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

        <g pointerEvents="none">
          <AnimatePresence>
            {Object.entries(pins)
              .filter(([n]) => Number(n) >= visitStart && Number(n) < thrown)
              .map(([n, point]) => (
                <DartPin key={n} point={point} />
              ))}
          </AnimatePresence>
        </g>
      </svg>
    </div>
  );
}

/** Lies along the x axis with the tip at the origin; `DartPin` tilts it. */
const DART_ANGLE = -52;
/** The shadow falls away from a light above-left, flatter than the dart. */
const SHADOW_ANGLE = -18;
/** A light almost in front of the board casts a shadow shorter than the dart. */
const SHADOW_LENGTH = 0.7;

/** Gradients the pins share — rendered once inside the board's `<svg>`. */
function DartDefs() {
  return (
    <defs>
      {/* Shaded across the dart's width, so each part reads as a cylinder. */}
      <linearGradient id="dart-steel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f4f4" />
        <stop offset="0.45" stopColor="#b9bcc0" />
        <stop offset="1" stopColor="#5d6066" />
      </linearGradient>
      <linearGradient id="dart-barrel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8d939b" />
        <stop offset="0.3" stopColor="#e3e6ea" />
        <stop offset="0.6" stopColor="#6b7078" />
        <stop offset="1" stopColor="#2b2e33" />
      </linearGradient>
      <linearGradient id="dart-shaft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#555" />
        <stop offset="0.4" stopColor="#222" />
        <stop offset="1" stopColor="#000" />
      </linearGradient>
      <linearGradient id="dart-flight" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7fb6ff" />
        <stop offset="1" stopColor="#1d5fc7" />
      </linearGradient>
      <linearGradient id="dart-flight-back" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3f82e0" />
        <stop offset="1" stopColor="#123f88" />
      </linearGradient>
      {/* The shadow is darkest and sharpest where the dart enters the board
          and fades the farther it falls from it. */}
      <linearGradient
        id="dart-shadow-fade"
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2="50"
        y2="0"
      >
        <stop offset="0" stopColor="#000" stopOpacity="0.75" />
        <stop offset="0.35" stopColor="#000" stopOpacity="0.4" />
        <stop offset="1" stopColor="#000" stopOpacity="0.12" />
      </linearGradient>
      {/* The steel darkens as it disappears into the bed. */}
      <linearGradient
        id="dart-sink"
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2="6"
        y2="0"
      >
        <stop offset="0" stopColor="#000" stopOpacity="0.7" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="dart-hole">
        <stop offset="0" stopColor="#000" stopOpacity="0.85" />
        <stop offset="0.6" stopColor="#000" stopOpacity="0.45" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <filter id="dart-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.4" />
      </filter>
    </defs>
  );
}

/** The dart's outline, for the shadow. */
const DART_SILHOUETTE =
  "M 0 -0.8 L 10 -1.9 L 27 -2.6 L 33 -1 L 40 -9 L 50 -9 L 48 0 L 50 9 L 40 9 L 33 1 L 27 2.6 L 10 1.9 L 0 0.8 Z";

/** The visible part of the point: the rest of it is buried in the board. */
const POINT_STUB = "M 0 -0.75 L 10.5 -1.1 L 10.5 1.1 L 0 0.75 Z";

/**
 * A dart stuck where the board was clicked: the point disappears into the bed
 * exactly on the spot, the body leans up and to the right so it never hides
 * the bed it hit.
 */
function DartPin({ point }: { point: Point }) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      {/* What the impact leaves on the board: the hole and the shadow, which
          both start at the point so the dart looks planted, not laid on. */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { delay: reduceMotion ? 0 : 0.1, duration: 0.15 },
        }}
        exit={{ opacity: 0 }}
      >
        <path
          d={DART_SILHOUETTE}
          transform={`rotate(${SHADOW_ANGLE}) scale(${SHADOW_LENGTH} 1)`}
          fill="url(#dart-shadow-fade)"
          filter="url(#dart-shadow)"
        />
        <ellipse rx={3.2} ry={2.6} fill="url(#dart-hole)" />
      </motion.g>
      <motion.g
        // An invisible square centred on the tip makes the tip the middle of
        // the group's box, so scaling and wobbling both pivot on it.
        style={{ originX: 0.5, originY: 0.5 }}
        initial={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, x: 36, y: -36, scale: 1.7 }
        }
        animate={{
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotate: reduceMotion ? 0 : [0, 0, -5, 3, -1.5, 0],
          transition: reduceMotion
            ? { duration: 0.15 }
            : {
                default: { type: "spring", stiffness: 700, damping: 30 },
                opacity: { duration: 0.08 },
                rotate: { duration: 0.55, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
              },
        }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
      >
        <rect x={-50} y={-50} width={100} height={100} fill="none" />
        <g transform={`rotate(${DART_ANGLE})`}>
          {/* Point, sunk into the bed */}
          <path d={POINT_STUB} fill="url(#dart-steel)" />
          <path d={POINT_STUB} fill="url(#dart-sink)" />
          {/* Barrel, knurled for grip — widening a little towards the viewer */}
          <path
            d="M 10 -1.9 Q 18 -3.1 27 -2.6 L 27 2.6 Q 18 3.1 10 1.9 Z"
            fill="url(#dart-barrel)"
          />
          <g stroke="#1b1d21" strokeOpacity={0.55} strokeWidth={0.6}>
            {[13, 15, 17, 19, 21, 23].map((x) => (
              <line key={x} x1={x} y1={-2.6} x2={x} y2={2.6} />
            ))}
          </g>
          {/* Shaft */}
          <rect
            x={26.5}
            y={-1.1}
            width={10}
            height={2.2}
            rx={0.8}
            fill="url(#dart-shaft)"
          />
          {/* Flights: the far wing first, the near one over it. */}
          <path
            d="M 33 0 L 40 9 L 50 9 L 48 0 Z"
            fill="url(#dart-flight-back)"
          />
          <path d="M 33 0 L 40 -9 L 50 -9 L 48 0 Z" fill="url(#dart-flight)" />
          <line
            x1={33}
            y1={0}
            x2={48.5}
            y2={0}
            stroke="#0b2e66"
            strokeWidth={0.8}
          />
        </g>
      </motion.g>
    </g>
  );
}
