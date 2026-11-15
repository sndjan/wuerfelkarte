/**
 * Plays the animated Noto emoji. Everything here is loaded on the first
 * animation only: the Lottie player (light build, SVG renderer) and each
 * emoji's JSON from `public/emoji/`. Pages that never animate load none of it.
 */
import type { AnimationItem, LottiePlayer } from "lottie-web";

import { NOTO_EMOJI } from "./manifest";

/** The manifest entry for an emoji, or undefined when Noto has no drawing for it. */
export function notoEntry(emoji: string) {
  return NOTO_EMOJI[emoji.replaceAll("️", "")];
}

let lottie: Promise<LottiePlayer> | null = null;
const loadLottie = () =>
  (lottie ??= import("lottie-web/build/player/lottie_light").then(
    (m) => (m.default ?? m) as unknown as LottiePlayer,
  ));

/** Raw JSON text per emoji: Lottie mutates the parsed data, so every player parses its own copy. */
const json = new Map<string, Promise<string>>();
const loadJson = (key: string) => {
  let text = json.get(key);
  if (!text) {
    text = fetch(`/emoji/${key}.json`).then((res) => {
      if (!res.ok) throw new Error(`emoji ${key}: ${res.status}`);
      return res.text();
    });
    text.catch(() => json.delete(key));
    json.set(key, text);
  }
  return text;
};

/** Starts both downloads, e.g. on pointerdown, so the click that follows plays at once. */
export function preload(key: string) {
  void loadLottie().catch(() => {});
  void loadJson(key).catch(() => {});
}

export async function createAnimation(container: HTMLElement, key: string): Promise<AnimationItem> {
  const [player, text] = await Promise.all([loadLottie(), loadJson(key)]);
  // Its own box, so destroying a stale player (Lottie empties its container) can't take a newer one with it.
  const box = document.createElement("div");
  box.style.cssText = "position:absolute; inset:0;";
  container.appendChild(box);
  const item = player.loadAnimation({
    container: box,
    renderer: "svg",
    loop: false,
    autoplay: false,
    animationData: JSON.parse(text),
    rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
  });
  const destroy = item.destroy.bind(item);
  item.destroy = (name?: string) => {
    destroy(name);
    box.remove();
  };
  return item;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Every mounted emoji, by its element, so a tap anywhere can play the emoji
 * inside the button that was tapped (see `EmojiTriggers`).
 */
export const emojiControls = new WeakMap<Element, { play: () => void; preload: () => void }>();

/**
 * The static Noto image for an emoji as an HTML string, for pictures built
 * from markup (the share PNG). Text that isn't a known emoji comes back
 * escaped by `escape`.
 */
export function emojiImageHtml(emoji: string, escape: (s: string) => string) {
  const entry = notoEntry(emoji);
  return entry
    ? `<img src="/emoji/${entry.k}.svg" alt="${escape(emoji)}" style="display:inline-block; width:1em; height:1em; vertical-align:-0.125em;" />`
    : escape(emoji);
}
