"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";

/** How long the banner stays up before it sweeps out on its own. */
const SHOW_MS = 2600;

export type MaximumShout = {
  /** Changes with every 180, so a second one right after replays the banner. */
  key: number;
  name: string;
  emoji?: string;
};

/**
 * The TV-style "180!" — stripes sweep in across the screen, the number slams
 * onto them and everything sweeps out again. A tap anywhere skips it, so the
 * next player is never held up.
 */
export function MaximumBanner({
  shout,
  onDone,
}: {
  shout: MaximumShout | null;
  onDone: () => void;
}) {
  return (
    <AnimatePresence>
      {shout && <Banner key={shout.key} shout={shout} onDone={onDone} />}
    </AnimatePresence>
  );
}

function Banner({
  shout,
  onDone,
}: {
  shout: MaximumShout;
  onDone: () => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    navigator.vibrate?.([80, 40, 80, 40, 300]);
    const timer = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  // Stripes alternate the side they come from and leave through the other.
  const sweep = (fromLeft: boolean, delay: number) =>
    reduceMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        }
      : {
          initial: { x: fromLeft ? "-120%" : "120%" },
          animate: {
            x: 0,
            transition: { type: "spring" as const, stiffness: 320, damping: 30, delay },
          },
          exit: {
            x: fromLeft ? "120%" : "-120%",
            transition: { duration: 0.3, ease: "easeIn" as const, delay },
          },
        };

  return (
    <motion.div
      role="alert"
      aria-label={`180 von ${shout.name}`}
      onClick={onDone}
      className="fixed inset-0 z-60 flex cursor-pointer items-center justify-center overflow-hidden"
      initial={{ backgroundColor: "rgba(0,0,0,0)" }}
      animate={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      exit={{ backgroundColor: "rgba(0,0,0,0)", transition: { delay: 0.2 } }}
    >
      <div className="flex w-[200vw] shrink-0 -rotate-[8deg] flex-col gap-3">
        <motion.div
          className="h-3 bg-yellow-400 sm:h-4"
          {...sweep(true, 0)}
        />

        <motion.div
          className="relative flex flex-col items-center bg-linear-to-b from-[#2f9161] to-[#257550] py-4 shadow-2xl"
          {...sweep(false, 0.05)}
        >
          <motion.span
            className="block text-[26vw] leading-none font-black italic tracking-tighter text-white sm:text-[11rem]"
            style={{
              textShadow:
                "0.04em 0.04em 0 #facc15, 0.08em 0.08em 0 rgba(0,0,0,0.35)",
            }}
            initial={reduceMotion ? { opacity: 0 } : { scale: 3, opacity: 0 }}
            animate={
              reduceMotion
                ? { opacity: 1 }
                : {
                    scale: [3, 0.9, 1.08, 1, 1.06, 1],
                    opacity: 1,
                    x: [0, 0, -10, 10, -6, 6, 0],
                    transition: {
                      delay: 0.25,
                      duration: 1.3,
                      times: [0, 0.18, 0.3, 0.42, 0.7, 1],
                      ease: "easeOut",
                      opacity: { delay: 0.25, duration: 0.1 },
                      x: { delay: 0.45, duration: 0.35 },
                    },
                  }
            }
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            180!
          </motion.span>

          <motion.span
            className="text-lg font-bold uppercase tracking-widest text-yellow-300 sm:text-2xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.7 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {shout.emoji} {shout.name}
          </motion.span>
        </motion.div>

        <motion.div
          className="h-3 bg-yellow-400 sm:h-4"
          {...sweep(true, 0.1)}
        />
      </div>
    </motion.div>
  );
}
