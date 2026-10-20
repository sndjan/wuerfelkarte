"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Dice,
  EasterEgg,
  Present,
  Pumpkin,
  WunderBurst,
  type WunderStyle,
} from "@/components/common/seasonal/WunderBurst";
import { Button } from "@/components/ui/button";
import { MaximumBanner } from "@/games/darts/components/MaximumBanner";

type AnimationId = WunderStyle | "Maximum";

const ANIMATIONS: Array<{ id: AnimationId; label: string }> = [
  { id: "Christmas", label: "🎁 Wunder: Geschenk" },
  { id: "Halloween", label: "🎃 Wunder: Kürbis" },
  { id: "Easter", label: "🥚 Wunder: Osterei" },
  { id: "Dice", label: "🎲 Wunder: Würfel (kein Theme)" },
  { id: "Maximum", label: "🎯 Darts: 180!" },
];

const NAME = "Test";
const EMOJI = "🧪";

/** A still look at the shape behind each animation, where there is one. */
function Preview({ id }: { id: AnimationId }) {
  switch (id) {
    case "Christmas":
      return <Present still />;
    case "Halloween":
      return <Pumpkin still />;
    case "Easter":
      return <EasterEgg still />;
    case "Dice":
      // Dice position themselves around the centre, like in the overlay.
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <Dice still />
        </div>
      );
    case "Maximum":
      return (
        <span className="my-auto text-6xl font-black italic text-muted-foreground">
          180!
        </span>
      );
  }
}

/**
 * Shows the celebration shapes standing still and replays each animation on
 * demand, so edits can be watched with hot reload.
 */
export function AnimationsPlayground() {
  const [playing, setPlaying] = useState<{
    id: AnimationId;
    key: number;
  } | null>(null);
  const [loop, setLoop] = useState<AnimationId | null>(null);

  const play = useCallback(
    (id: AnimationId) => setPlaying({ id, key: Date.now() }),
    [],
  );
  const stop = useCallback(() => setPlaying(null), []);

  // While looping, start the next round a moment after the last one closed.
  useEffect(() => {
    if (!loop || playing) return;
    const timer = setTimeout(() => play(loop), 600);
    return () => clearTimeout(timer);
  }, [loop, playing, play]);

  const wunder =
    playing && playing.id !== "Maximum"
      ? { key: playing.key, name: NAME, emoji: EMOJI, style: playing.id }
      : null;
  const maximum =
    playing?.id === "Maximum"
      ? { key: playing.key, name: NAME, emoji: EMOJI }
      : null;

  return (
    <div className="min-h-full bg-background p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Animationen</h1>

      <div className="grid gap-6 sm:grid-cols-2">
        {ANIMATIONS.map(({ id, label }) => (
          <section
            key={id}
            className="flex flex-col items-center gap-4 rounded-xl border p-6"
          >
            <h2 className="font-semibold">{label}</h2>

            <div className="relative flex h-64 w-full items-end justify-center">
              <div className="flex flex-col items-center self-stretch justify-end">
                <Preview id={id} />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => play(id)}>Abspielen</Button>
              <Button
                variant={loop === id ? "default" : "outline"}
                onClick={() => setLoop(loop === id ? null : id)}
              >
                {loop === id ? "Dauerschleife stoppen" : "Dauerschleife"}
              </Button>
            </div>
          </section>
        ))}
      </div>

      <WunderBurst shout={wunder} onDone={stop} />
      <MaximumBanner shout={maximum} onDone={stop} />
    </div>
  );
}
