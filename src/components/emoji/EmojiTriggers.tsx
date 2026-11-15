"use client";

import { useEffect } from "react";

import { emojiControls } from "./player";

/** What counts as "the thing that was tapped": the emoji inside it play. */
const ACTIONABLE =
  'button, a[href], label, summary, [role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="menuitemradio"], [role="radio"], [role="checkbox"], [role="switch"], [data-emoji-trigger]';

/** At most this many emoji play per tap, so a big button full of them stays calm. */
const MAX_PER_TAP = 4;

function emojiFor(target: EventTarget | null): Element[] {
  if (!(target instanceof Element)) return [];
  const own = target.closest("[data-emoji]");
  const action = target.closest(ACTIONABLE);
  if (!action) return own ? [own] : [];
  return [...action.querySelectorAll("[data-emoji]")].slice(0, MAX_PER_TAP);
}

/**
 * One listener for the whole app: a tap on an emoji, or on a button, link or
 * option holding one, plays it. Pressing starts the download, so by the time
 * the click lands the animation is usually ready.
 */
export function EmojiTriggers() {
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      for (const el of emojiFor(event.target)) emojiControls.get(el)?.preload();
    };
    const onClick = (event: MouseEvent) => {
      for (const el of emojiFor(event.target)) emojiControls.get(el)?.play();
    };
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", onDown, { capture: true });
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, []);
  return null;
}
