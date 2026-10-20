"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import type { Theme } from "./useSeasonalTheme";

/** How long the overlay stays up before it fades out on its own. */
const SHOW_MS = 3200;
/** When the container bursts, in seconds after it starts dropping in. */
const BURST_AT = 1.15;
/** The dice need longer: all five have to land before they burst. */
const DICE_BURST_AT = 1.75;

/** The seasonal containers, plus the dice for the rest of the year. */
export type WunderStyle = Exclude<Theme, "none"> | "Dice";

/**
 * Which Wunder animation to play: the season's own while its theme is on,
 * the dice when no seasonal theme is active.
 */
export const wunderStyleFor = (
  theme: Theme,
  isThemeActive: boolean,
): WunderStyle => (!isThemeActive || theme === "none" ? "Dice" : theme);

const LOOKS: Record<
  WunderStyle,
  { particles: string[]; textShadow: string; flash: string; burstAt: number }
> = {
  Christmas: {
    burstAt: BURST_AT,
    particles: [
      "❄️",
      "✨",
      "⭐",
      "🎄",
      "❄️",
      "✨",
      "🎁",
      "⭐",
      "❄️",
      "✨",
      "🍪",
      "⭐",
      "❄️",
      "✨",
    ],
    textShadow:
      "0.04em 0.04em 0 #c62828, 0.08em 0.08em 0 #166534, 0 0 0.4em rgba(253,230,138,0.8)",
    flash: "bg-[radial-gradient(circle,#fff_0%,#fde68a_45%,transparent_70%)]",
  },
  Halloween: {
    burstAt: BURST_AT,
    particles: [
      "🦇",
      "👻",
      "🍬",
      "🕸️",
      "🦇",
      "✨",
      "🍭",
      "👻",
      "🦇",
      "🍬",
      "🕷️",
      "✨",
      "🦇",
      "👻",
    ],
    textShadow:
      "0.04em 0.04em 0 #ea580c, 0.08em 0.08em 0 #581c87, 0 0 0.4em rgba(251,146,60,0.8)",
    flash:
      "bg-[radial-gradient(circle,#fef08a_0%,#f97316_45%,transparent_70%)]",
  },
  Easter: {
    burstAt: BURST_AT,
    particles: [
      "🐣",
      "🌷",
      "✨",
      "🐰",
      "🥚",
      "🌸",
      "🐣",
      "✨",
      "🌷",
      "🐰",
      "🌸",
      "🥚",
      "🐣",
      "✨",
    ],
    textShadow:
      "0.04em 0.04em 0 #ec4899, 0.08em 0.08em 0 #6d28d9, 0 0 0.4em rgba(249,168,212,0.8)",
    flash: "bg-[radial-gradient(circle,#fff_0%,#f9a8d4_45%,transparent_70%)]",
  },
  Dice: {
    burstAt: DICE_BURST_AT,
    particles: [
      "🎲",
      "✨",
      "⭐",
      "🎲",
      "✨",
      "⭐",
      "🎲",
      "✨",
      "⭐",
      "🎲",
      "✨",
      "⭐",
    ],
    textShadow:
      "0.04em 0.04em 0 #16a34a, 0.08em 0.08em 0 #14532d, 0 0 0.4em rgba(134,239,172,0.7)",
    flash: "bg-[radial-gradient(circle,#fff_0%,#86efac_45%,transparent_70%)]",
  },
};

export type WunderShout = {
  /** Changes with every Wunder, so a second one right after replays it. */
  key: number;
  name: string;
  emoji?: string;
  style: WunderStyle;
};

/**
 * The Wunder celebration: a present (Christmas) or a pumpkin (Halloween)
 * drops in, shakes and bursts apart, or five dice land on the same number one
 * after another and fly off; then "WUNDER" pops out. A tap anywhere skips it.
 */
export function WunderBurst({
  shout,
  onBurst,
  onDone,
}: {
  shout: WunderShout | null;
  /** Fired the moment the container bursts, e.g. to throw confetti. */
  onBurst?: () => void;
  onDone: () => void;
}) {
  // The overlay is portalled to <body> so no transformed ancestor (cards,
  // carousels) can trap its `fixed` positioning; that needs the DOM.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {shout && (
        <Overlay
          key={shout.key}
          shout={shout}
          onBurst={onBurst}
          onDone={onDone}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Overlay({
  shout,
  onBurst,
  onDone,
}: {
  shout: WunderShout;
  onBurst?: () => void;
  onDone: () => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const look = LOOKS[shout.style];
  const burstAt = look.burstAt;

  useEffect(() => {
    const burst = setTimeout(
      () => {
        navigator.vibrate?.([60, 30, 200]);
        onBurst?.();
      },
      reduceMotion ? 0 : burstAt * 1000,
    );
    // Slower styles get their extra build-up added on top.
    const done = setTimeout(onDone, SHOW_MS + (burstAt - BURST_AT) * 1000);
    return () => {
      clearTimeout(burst);
      clearTimeout(done);
    };
    // Only once per shout; a re-rendered parent must not restart the timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const textDelay = reduceMotion ? 0 : burstAt + 0.05;

  return (
    <motion.div
      role="alert"
      aria-label={`Wunder von ${shout.name}`}
      onClick={onDone}
      className="fixed inset-0 z-60 flex cursor-pointer items-center justify-center overflow-hidden"
      initial={{ backgroundColor: "rgba(0,0,0,0)" }}
      animate={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      exit={{ backgroundColor: "rgba(0,0,0,0)", transition: { delay: 0.1 } }}
    >
      {!reduceMotion &&
        (shout.style === "Dice" ? (
          <Dice />
        ) : (
          <DropAndShake>
            {shout.style === "Christmas" && <Present />}
            {shout.style === "Halloween" && <Pumpkin />}
            {shout.style === "Easter" && <EasterEgg />}
          </DropAndShake>
        ))}

      {/* Flash at the moment of the burst. */}
      {!reduceMotion && (
        <motion.div
          className={`pointer-events-none absolute size-40 rounded-full ${look.flash}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 4.5],
            opacity: [1, 0],
            transition: { delay: burstAt, duration: 0.6, ease: "easeOut" },
          }}
        />
      )}

      {!reduceMotion &&
        look.particles.map((particle, i) => {
          const angle = (i / look.particles.length) * Math.PI * 2;
          const distance = 180 + (i % 3) * 70;
          return (
            <motion.span
              key={i}
              className="pointer-events-none absolute text-3xl sm:text-4xl"
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance + 60,
                scale: [0, 1.3, 1],
                opacity: [0, 1, 1, 0],
                rotate: (i % 2 ? 1 : -1) * 180,
                transition: { delay: burstAt, duration: 1.4, ease: "easeOut" },
              }}
            >
              {particle}
            </motion.span>
          );
        })}

      <div className="relative flex flex-col items-center">
        <motion.span
          className="block text-[14vw] leading-none font-black italic tracking-tight text-white sm:text-[6.5rem]"
          style={{ textShadow: look.textShadow }}
          initial={
            reduceMotion
              ? { opacity: 0 }
              : { scale: 0, opacity: 0, rotate: -12 }
          }
          animate={
            reduceMotion
              ? { opacity: 1 }
              : {
                  scale: [0, 1.25, 0.95, 1],
                  opacity: 1,
                  rotate: [-12, 4, -2, 0],
                  transition: {
                    delay: textDelay,
                    duration: 0.7,
                    times: [0, 0.45, 0.75, 1],
                    ease: "easeOut",
                    opacity: { delay: textDelay, duration: 0.1 },
                  },
                }
          }
          exit={{ opacity: 0, scale: 1.2, transition: { duration: 0.2 } }}
        >
          WUNDER!
        </motion.span>

        <motion.span
          className="mt-2 text-lg font-bold uppercase tracking-widest text-yellow-300 sm:text-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: textDelay + 0.4 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {shout.emoji} {shout.name}
        </motion.span>
      </div>
    </motion.div>
  );
}

/** Drops its contents in from the top, then shakes them harder and harder. */
function DropAndShake({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      initial={{ y: "-70vh" }}
      animate={{
        y: 0,
        transition: { type: "spring", stiffness: 260, damping: 18 },
      }}
    >
      <motion.div
        className="flex flex-col items-center"
        animate={{
          rotate: [0, -4, 4, -7, 7, -10, 10, -12, 0],
          scale: [1, 1, 1.03, 1.03, 1.06, 1.06, 1.1, 1.14, 1.2],
          transition: { delay: 0.5, duration: BURST_AT - 0.5, ease: "easeIn" },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * Flies a piece off in the given direction when the burst hits. `still`
 * keeps it in place, for previewing the shape on its own.
 */
const fly = (to: { x: number; y: number; rotate: number }, still: boolean) =>
  still
    ? {}
    : {
        animate: {
          ...to,
          opacity: 0,
          transition: {
            delay: BURST_AT,
            duration: 0.7,
            ease: "easeOut" as const,
          },
        },
      };

type ShapeProps = { still?: boolean };

/**
 * Shows a drawing as two halves side by side, each the full drawing cropped
 * to its side, so they can fly apart in opposite directions on the burst.
 */
function SplitHalves({
  width,
  height,
  spread,
  still,
  children,
}: {
  width: number;
  height: number;
  /** Where the right half flies; the left half mirrors it. */
  spread: { x: number; y: number; rotate: number };
  still: boolean;
  children: React.ReactNode;
}) {
  const half = "relative overflow-hidden drop-shadow-lg";
  const size = { width: width / 2, height };
  const { x, y, rotate } = spread;

  return (
    <div className="flex">
      <motion.div
        className={half}
        style={size}
        {...fly({ x: -x, y, rotate: -rotate }, still)}
      >
        <div className="absolute left-0">{children}</div>
      </motion.div>
      <motion.div
        className={half}
        style={size}
        {...fly({ x, y, rotate }, still)}
      >
        <div className="absolute" style={{ left: -width / 2 }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/** Size of the present's box (without lid); the lid overhangs it a bit. */
const BOX_W = 176;
const BOX_H = 140;
const LID_W = 196;
/** The lid drawing includes the bow sitting on top of it. */
const LID_H = 108;
const LID_TOP = 72;
const RIBBON_W = 26;
/** Scales the bow around its knot. */
const BOW_SCALE = 1.15;

/** Red paper, shaded darker towards the right, with a gold ribbon. */
function PresentBox() {
  // useId's colons are not valid inside url(#…) references.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ribbonX = (BOX_W - RIBBON_W) / 2;

  return (
    <svg width={BOX_W} height={BOX_H} viewBox={`0 0 ${BOX_W} ${BOX_H}`}>
      <defs>
        <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="0.55" stopColor="#c62828" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="0.55" stopColor="#eab308" />
          <stop offset="1" stopColor="#a16207" />
        </linearGradient>
      </defs>

      <rect width={BOX_W} height={BOX_H} rx={6} fill={`url(#${id}-paper)`} />
      <rect
        x={ribbonX}
        width={RIBBON_W}
        height={BOX_H}
        fill={`url(#${id}-ribbon)`}
      />
      <rect
        x={ribbonX + 4}
        width={2}
        height={BOX_H}
        fill="#fff"
        opacity={0.35}
      />
      {/* Shadow cast by the overhanging lid. */}
      <rect width={BOX_W} height={12} fill="#000" opacity={0.18} />
    </svg>
  );
}

/** The lid with the ribbon running over it and the bow tied on top. */
function PresentLid() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cx = LID_W / 2;
  const lidH = LID_H - LID_TOP;

  return (
    <svg
      width={LID_W}
      height={LID_H}
      viewBox={`0 0 ${LID_W} ${LID_H}`}
      className="overflow-visible drop-shadow-lg"
    >
      <defs>
        <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f87171" />
          <stop offset="0.6" stopColor="#dc2626" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="0.55" stopColor="#eab308" />
          <stop offset="1" stopColor="#a16207" />
        </linearGradient>
        <linearGradient id={`${id}-loop`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
      </defs>

      <rect
        y={LID_TOP}
        width={LID_W}
        height={lidH}
        rx={5}
        fill={`url(#${id}-lid)`}
      />
      <rect
        x={cx - RIBBON_W / 2}
        y={LID_TOP}
        width={RIBBON_W}
        height={lidH}
        fill={`url(#${id}-ribbon)`}
      />
      <rect
        y={LID_H - 5}
        width={LID_W}
        height={5}
        rx={2}
        fill="#000"
        opacity={0.15}
      />

      <g
        transform={`translate(${cx} 66) scale(${BOW_SCALE}) translate(${-cx} -66)`}
      >
        {/* Bow: tails, then the two loops, then the knot over them. */}
        <g stroke="#7f1d1d" strokeWidth={1.5} strokeLinejoin="round">
          <path
            d={`M${cx - 4} 74 L${cx - 30} 112 L${cx - 20} 108 L${cx - 16} 118 L${cx + 4} 78 Z`}
            fill="#b91c1c"
          />
          <path
            d={`M${cx + 4} 74 L${cx + 30} 112 L${cx + 20} 108 L${cx + 16} 118 L${cx - 4} 78 Z`}
            fill="#991b1b"
          />
          <path
            d={`M${cx} 66 C${cx - 30} 24 ${cx - 76} 30 ${cx - 64} 62 C${cx - 56} 80 ${cx - 24} 78 ${cx} 66 Z`}
            fill={`url(#${id}-loop)`}
          />
          <path
            d={`M${cx} 66 C${cx + 30} 24 ${cx + 76} 30 ${cx + 64} 62 C${cx + 56} 80 ${cx + 24} 78 ${cx} 66 Z`}
            fill={`url(#${id}-loop)`}
          />
        </g>
        {/* Inner folds of the loops. */}
        <path
          d={`M${cx - 6} 64 C${cx - 28} 44 ${cx - 54} 44 ${cx - 52} 58 C${cx - 40} 56 ${cx - 22} 60 ${cx - 6} 66 Z`}
          fill="#7f1d1d"
          opacity={0.55}
        />
        <path
          d={`M${cx + 6} 64 C${cx + 28} 44 ${cx + 54} 44 ${cx + 52} 58 C${cx + 40} 56 ${cx + 22} 60 ${cx + 6} 66 Z`}
          fill="#7f1d1d"
          opacity={0.55}
        />
        <rect
          x={cx - 12}
          y={54}
          width={24}
          height={24}
          rx={7}
          fill="#dc2626"
          stroke="#7f1d1d"
          strokeWidth={1.5}
        />
        <rect
          x={cx - 7}
          y={58}
          width={6}
          height={10}
          rx={3}
          fill="#fff"
          opacity={0.3}
        />
      </g>
    </svg>
  );
}

/** A wrapped present: the lid flies up, the box splits in two. */
export function Present({ still = false }: ShapeProps) {
  return (
    <>
      <motion.div
        className="relative z-10 -mb-1"
        {...fly({ x: 40, y: -320, rotate: 35 }, still)}
      >
        <PresentLid />
      </motion.div>

      <SplitHalves
        width={BOX_W}
        height={BOX_H}
        spread={{ x: 260, y: 80, rotate: 50 }}
        still={still}
      >
        <PresentBox />
      </SplitHalves>
    </>
  );
}

/** Size of the pumpkin drawing; each half shows one side of it. */
const PUMPKIN_W = 220;
const PUMPKIN_H = 182;

/** The carved, glowing face: eyes, nose and a toothy grin (always last). */
const FACE = [
  "M58 90 L82 58 L100 88 Q80 82 58 90 Z",
  "M162 90 L138 58 L120 88 Q140 82 162 90 Z",
  "M103 104 L110 91 L117 104 Z",
  "M52 110 Q110 142 168 110 Q152 156 110 160 Q68 156 52 110 Z",
];
/** Teeth are pumpkin-coloured blocks laid over the grin. */
const TEETH = [
  { x: 100, y: 112, w: 20, h: 27 },
  { x: 72, y: 131, w: 16, h: 30 },
  { x: 132, y: 131, w: 16, h: 30 },
];

/**
 * The whole pumpkin as one SVG. Gradients use absolute units so the teeth
 * pick up exactly the colour of the lobe behind them.
 */
function PumpkinBody() {
  // useId's colons are not valid inside url(#…) references.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const grad = (name: string) => `url(#${id}-${name})`;
  const lobe = (cx: number, rx: number, ry: number, fill: string) => (
    <ellipse
      cx={cx}
      cy={100}
      rx={rx}
      ry={ry}
      fill={grad(fill)}
      stroke="#9a3412"
      strokeOpacity={0.45}
      strokeWidth={1.5}
    />
  );

  return (
    <svg
      width={PUMPKIN_W}
      height={PUMPKIN_H}
      viewBox={`0 0 ${PUMPKIN_W} ${PUMPKIN_H}`}
      className="absolute top-0"
    >
      <defs>
        <linearGradient
          id={`${id}-outer`}
          x1="0"
          y1="25"
          x2="0"
          y2="175"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ea580c" />
          <stop offset="1" stopColor="#9a3412" />
        </linearGradient>
        <linearGradient
          id={`${id}-inner`}
          x1="0"
          y1="20"
          x2="0"
          y2="180"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f97316" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient
          id={`${id}-center`}
          x1="0"
          y1="20"
          x2="0"
          y2="180"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <radialGradient
          id={`${id}-glow`}
          cx="110"
          cy="115"
          r="70"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.45" stopColor="#fde047" />
          <stop offset="1" stopColor="#f59e0b" />
        </radialGradient>
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        {/* Keeps the teeth inside the grin. */}
        <clipPath id={`${id}-mouth`}>
          <path d={FACE[FACE.length - 1]} />
        </clipPath>
      </defs>

      {lobe(55, 50, 70, "outer")}
      {lobe(165, 50, 70, "outer")}
      {lobe(82, 48, 78, "inner")}
      {lobe(138, 48, 78, "inner")}
      {lobe(110, 40, 80, "center")}

      {/* Candle light bleeding out of the cut-outs, then the cut-outs. */}
      <g filter={grad("blur")} opacity={0.8}>
        {FACE.map((d) => (
          <path key={d} d={d} fill="#fde047" />
        ))}
      </g>
      {FACE.map((d) => (
        <path
          key={d}
          d={d}
          fill={grad("glow")}
          stroke="#7c2d12"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
      <g clipPath={grad("mouth")}>
        {TEETH.map(({ x, y, w, h }) => (
          <rect
            key={x}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={2}
            fill={grad("center")}
          />
        ))}
      </g>
    </svg>
  );
}

/** Curved stem with a leaf and a curly vine. */
function PumpkinStem() {
  return (
    <svg
      width={60}
      height={46}
      viewBox="0 0 60 46"
      className="overflow-visible"
    >
      <path
        d="M33 30 C46 30 52 18 45 15 C39 13 38 22 46 22"
        fill="none"
        stroke="#4d7c0f"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d="M30 20 C20 6 8 12 4 18 C14 26 24 26 30 20 Z"
        fill="#65a30d"
        stroke="#365314"
        strokeWidth={1.5}
      />
      <path
        d="M30 20 C20 17 12 17 6 18"
        fill="none"
        stroke="#365314"
        strokeWidth={1}
      />
      <path
        d="M24 46 C22 30 25 14 35 4 L43 9 C35 18 33 30 35 46 Z"
        fill="#3f6212"
        stroke="#1a2e05"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A jack-o'-lantern: the stem pops off, the pumpkin splits in two. */
export function Pumpkin({ still = false }: ShapeProps) {
  return (
    <>
      <motion.div
        className="relative z-10 -mb-6"
        {...fly({ x: -30, y: -340, rotate: -120 }, still)}
      >
        <PumpkinStem />
      </motion.div>

      <SplitHalves
        width={PUMPKIN_W}
        height={PUMPKIN_H}
        spread={{ x: 260, y: 90, rotate: 60 }}
        still={still}
      >
        <PumpkinBody />
      </SplitHalves>
    </>
  );
}

/** Size of the egg drawing. */
const EGG_W = 150;
const EGG_H = 190;
const EGG_PATH =
  "M75 5 C120 5 145 85 145 122 C145 162 115 185 75 185 C35 185 5 162 5 122 C5 85 30 5 75 5 Z";
/** The zigzag the shell cracks along, left to right. */
const CRACK: Array<[number, number]> = Array.from({ length: 11 }, (_, i) => [
  i * 15,
  i % 2 ? 86 : 100,
]);
const crackPoints = (points: Array<[number, number]>) =>
  points.map(([x, y]) => `${x}px ${y}px`).join(", ");

/** A painted Easter egg: pastel bands with zigzags, dots and stripes. */
function EggBody({ crackDelay }: { crackDelay?: number }) {
  // useId's colons are not valid inside url(#…) references.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const zigzag = (y: number, h: number) =>
    "M0 " +
    (y + h) +
    Array.from(
      { length: 16 },
      (_, i) => ` L${i * 10 + 5} ${y} L${i * 10 + 10} ${y + h}`,
    ).join("");

  return (
    <svg width={EGG_W} height={EGG_H} viewBox={`0 0 ${EGG_W} ${EGG_H}`}>
      <defs>
        <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#93c5fd" />
        </linearGradient>
        <clipPath id={`${id}-egg`}>
          <path d={EGG_PATH} />
        </clipPath>
      </defs>

      <path d={EGG_PATH} fill={`url(#${id}-shell)`} />
      <g clipPath={`url(#${id}-egg)`}>
        {/* Pink band with a white zigzag. */}
        <rect y={52} width={EGG_W} height={26} fill="#f9a8d4" />
        <path
          d={zigzag(58, 12)}
          fill="none"
          stroke="#fff"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {/* Yellow band with orange dots. */}
        <rect y={110} width={EGG_W} height={28} fill="#fde68a" />
        {Array.from({ length: 8 }, (_, i) => (
          <circle key={i} cx={10 + i * 19} cy={124} r={5} fill="#fb923c" />
        ))}
        {/* Thin lilac stripes near the bottom. */}
        <rect y={150} width={EGG_W} height={6} fill="#c4b5fd" />
        <rect y={162} width={EGG_W} height={6} fill="#c4b5fd" />
      </g>
      <path d={EGG_PATH} fill="none" stroke="#60a5fa" strokeWidth={1.5} />

      {/* The crack draws itself in while the egg shakes. */}
      {crackDelay !== undefined && (
        <motion.path
          d={"M" + CRACK.map(([x, y]) => `${x} ${y}`).join(" L")}
          fill="none"
          stroke="#475569"
          strokeWidth={2.5}
          strokeLinejoin="round"
          clipPath={`url(#${id}-egg)`}
          initial={{ pathLength: 0 }}
          animate={{
            pathLength: 1,
            transition: { delay: crackDelay, duration: BURST_AT - crackDelay },
          }}
        />
      )}
    </svg>
  );
}

/** An Easter egg: it cracks while shaking, then the shell halves fly apart. */
export function EasterEgg({ still = false }: ShapeProps) {
  const size = { width: EGG_W, height: EGG_H };
  const crackDelay = still ? undefined : 0.5;
  // Each shell half is the full egg, cut along the zigzag crack.
  const top = `polygon(0 0, ${EGG_W}px 0, ${crackPoints([...CRACK].reverse())})`;
  const bottom = `polygon(${crackPoints(CRACK)}, ${EGG_W}px ${EGG_H}px, 0 ${EGG_H}px)`;

  // In one piece for the preview; the halves would leave a faint seam.
  if (still) {
    return (
      <div className="drop-shadow-lg">
        <EggBody />
      </div>
    );
  }

  return (
    <div className="relative drop-shadow-lg" style={size}>
      <motion.div
        className="absolute inset-0"
        style={{ clipPath: top }}
        {...fly({ x: 70, y: -320, rotate: 45 }, still)}
      >
        <EggBody crackDelay={crackDelay} />
      </motion.div>
      <motion.div
        className="absolute inset-0"
        style={{ clipPath: bottom }}
        {...fly({ x: -60, y: 280, rotate: -35 }, still)}
      >
        <EggBody crackDelay={crackDelay} />
      </motion.div>
    </div>
  );
}

const DICE_COUNT = 5;
/** Seconds between one die landing and the next. */
const DICE_STAGGER = 0.22;
/** How long a single die tumbles before it lands. */
const DICE_ROLL = 0.45;

/** Pip positions on a 3×3 grid (0–8, row by row) for each face. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A single white die showing `value`. */
function DieFace({ value }: { value: number }) {
  return (
    <svg
      viewBox="0 0 60 60"
      className="size-14 drop-shadow-lg sm:size-18"
      aria-hidden
    >
      <rect
        x={2}
        y={2}
        width={56}
        height={56}
        rx={12}
        fill="#fff"
        stroke="#d4d4d4"
        strokeWidth={2}
      />
      {PIPS[value].map((pip) => (
        <circle
          key={pip}
          cx={15 + (pip % 3) * 15}
          cy={15 + Math.floor(pip / 3) * 15}
          r={5.5}
          fill="#171717"
        />
      ))}
    </svg>
  );
}

const randomFace = () => 1 + Math.floor(Math.random() * 6);

/** Shows random faces while tumbling, then settles on `value` at `landAt`. */
function RollingDie({ value, landAt }: { value: number; landAt: number }) {
  const [face, setFace] = useState(randomFace);

  useEffect(() => {
    let flicker: ReturnType<typeof setInterval> | undefined;
    const begin = setTimeout(
      () => {
        flicker = setInterval(() => setFace(randomFace()), 70);
      },
      (landAt - DICE_ROLL) * 1000,
    );
    const land = setTimeout(() => {
      clearInterval(flicker);
      setFace(value);
    }, landAt * 1000);
    return () => {
      clearTimeout(begin);
      clearTimeout(land);
      clearInterval(flicker);
    };
  }, [value, landAt]);

  return <DieFace value={face} />;
}

/**
 * Keyframe times for one die: tumble in, land, small bounce, wait for the
 * others without moving, then fly off.
 */
function keyTimes(start: number, landAt: number, total: number): number[] {
  const at = (t: number) => (t - start) / total;
  return [
    0,
    at(landAt),
    at(landAt + 0.08),
    at(landAt + 0.16),
    at(DICE_BURST_AT),
    1,
  ];
}

/**
 * Five dice roll in one after another, all landing on the same number, then
 * fly off to all sides. `still` shows them landed, for previewing.
 */
export function Dice({ still = false }: ShapeProps) {
  const [value] = useState(randomFace);

  return (
    <div className="pointer-events-none absolute flex gap-2 sm:gap-3">
      {Array.from({ length: DICE_COUNT }, (_, i) => {
        const landAt = 0.15 + DICE_ROLL + i * DICE_STAGGER;
        const start = landAt - DICE_ROLL;
        const total = DICE_BURST_AT + 0.7 - start;
        // Spread the dice evenly around the circle, starting upwards. The
        // offset cancels each die's place in the row, so all fly from the
        // centre.
        const angle = -Math.PI / 2 + (i / DICE_COUNT) * Math.PI * 2;
        const flyX = Math.cos(angle) * 420 - (i - 2) * 70;
        const flyY = Math.sin(angle) * 420;

        if (still) {
          return (
            <div key={i}>
              <DieFace value={6} />
            </div>
          );
        }

        return (
          <motion.div
            key={i}
            initial={{ y: -220, opacity: 0, rotate: -200, scale: 0.6 }}
            animate={{
              y: [-220, 0, -14, 0, 0, flyY],
              x: [0, 0, 0, 0, 0, flyX],
              opacity: [0, 1, 1, 1, 1, 0],
              rotate: [-200, 0, 0, 0, 0, (i % 2 ? 1 : -1) * 540],
              scale: [0.6, 1, 1, 1, 1, 1.4],
              transition: {
                delay: start,
                duration: total,
                times: keyTimes(start, landAt, total),
                ease: "easeOut",
              },
            }}
          >
            <RollingDie value={value} landAt={landAt} />
          </motion.div>
        );
      })}
    </div>
  );
}
