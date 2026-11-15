"use client";

import { Fragment, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { AnimationItem } from "lottie-web";

import { cn } from "@/lib/utils";

import { createAnimation, emojiControls, notoEntry, preload, prefersReducedMotion } from "./player";

type EmojiProps = {
  /** The emoji, e.g. "🏆". One Noto doesn't draw stays plain text. */
  e: string;
  className?: string;
  /** Read out instead of the emoji's own name; "" hides it from screen readers. */
  label?: string;
  /** Plays once as soon as it appears (a winner dialog, a banner). */
  autoPlay?: boolean;
  /** Plays again whenever this value changes (a streak, a score). */
  trigger?: unknown;
};

/**
 * One emoji in Google's Noto design, the same on iOS, Android and desktop.
 * At rest it is the static SVG; tapping it, or the button it sits in, plays
 * the animated Noto emoji once (or a little bounce where Google drew no
 * animation). It is 1em big, so it sizes with the text around it.
 */
export function Emoji({ e, className, label, autoPlay, trigger }: EmojiProps) {
  const entry = notoEntry(e);
  const root = useRef<HTMLSpanElement>(null);
  const stage = useRef<HTMLSpanElement>(null);
  const anim = useRef<AnimationItem | null>(null);
  const loading = useRef<Promise<AnimationItem | null> | null>(null);
  /** Bumped on cleanup, so a player that finishes loading after it is stale throws itself away. */
  const generation = useRef(0);
  const key = entry?.k;
  const animated = entry?.a === 1;

  const play = useCallback(() => {
    const el = root.current;
    if (!el || !key || prefersReducedMotion()) return;
    if (!animated) {
      el.classList.remove("wk-emoji-pop");
      void el.offsetWidth; // restart the CSS animation
      el.classList.add("wk-emoji-pop");
      return;
    }
    const born = generation.current;
    loading.current ??= createAnimation(stage.current!, key)
      .then((item) => {
        if (!root.current || born !== generation.current) {
          item.destroy();
          return null;
        }
        item.addEventListener("complete", () => root.current?.removeAttribute("data-playing"));
        anim.current = item;
        return item;
      })
      .catch(() => {
        loading.current = null;
        return null;
      });
    void loading.current.then((item) => {
      if (!item || !root.current) return;
      root.current.setAttribute("data-playing", "");
      item.goToAndPlay(0, true);
    });
  }, [key, animated]);

  // Register for taps on the surrounding button; tidy up the player on unmount or a new emoji.
  useEffect(() => {
    const el = root.current;
    if (!el || !key) return;
    emojiControls.set(el, { play, preload: () => animated && preload(key) });
    return () => {
      generation.current += 1;
      emojiControls.delete(el);
      anim.current?.destroy();
      anim.current = null;
      loading.current = null;
      el.removeAttribute("data-playing");
    };
  }, [key, animated, play]);

  useEffect(() => {
    if (autoPlay) play();
  }, [autoPlay, play]);

  const lastTrigger = useRef(trigger);
  useEffect(() => {
    if (Object.is(lastTrigger.current, trigger)) return;
    lastTrigger.current = trigger;
    play();
  }, [trigger, play]);

  if (!entry) {
    return (
      <span className={className} role={label === "" ? undefined : "img"} aria-label={label || undefined} aria-hidden={label === "" || undefined}>
        {e}
      </span>
    );
  }

  return (
    <span ref={root} data-emoji="" className={cn("wk-emoji", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a 1em SVG, nothing for next/image to optimise */}
      <img
        src={`/emoji/${entry.k}.svg`}
        alt={label ?? e}
        aria-hidden={label === "" || undefined}
        draggable={false}
        decoding="async"
      />
      {animated && <span ref={stage} className="wk-emoji-stage" aria-hidden="true" />}
    </span>
  );
}

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("de", { granularity: "grapheme" }) : null;

/**
 * A text with its emoji drawn as `<Emoji>`: "🏆 Anna gewinnt" keeps its words
 * and gets the Noto trophy. For strings that are built from data.
 */
export function EmojiText({ text, autoPlay }: { text: string; autoPlay?: boolean }) {
  if (!segmenter) return <>{text}</>;
  const parts: ReactNode[] = [];
  let plain = "";
  for (const { segment } of segmenter.segment(text)) {
    if (notoEntry(segment)) {
      if (plain) parts.push(plain);
      plain = "";
      parts.push(<Emoji key={parts.length} e={segment} autoPlay={autoPlay} />);
    } else plain += segment;
  }
  if (plain) parts.push(plain);
  return <>{parts.map((part, i) => (typeof part === "string" ? <Fragment key={i}>{part}</Fragment> : part))}</>;
}
