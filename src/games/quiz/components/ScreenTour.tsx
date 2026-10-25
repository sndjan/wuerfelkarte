"use client";

import { ChevronLeft, ChevronRight, Dices } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Die } from "./Die";
import { crossedPill, filledPill, openPill, pill } from "./Scorecard";

type Part = "rolls" | "dice" | "card" | "enter";

/** Where a step's bubble opens, relative to its part. */
type Place = "below" | "above";

const STEPS: { part: Part; place: Place; title: string; text: string }[] = [
  {
    part: "rolls",
    place: "below",
    title: "Würfe übrig",
    text: "So oft darfst du in dieser Aufgabe noch würfeln. Bei „Kein Wurf mehr“ musst du eintragen.",
  },
  {
    part: "dice",
    place: "below",
    title: "Deine Würfel",
    text: "Tippe einen Würfel, um ihn zu halten – er wird grün. „Würfeln“ wirft nur die anderen neu.",
  },
  {
    part: "card",
    place: "above",
    title: "Deine Karte",
    text: "Grau: schon eingetragen. Weiß: noch frei – die grüne Zahl zeigt, was deine Würfel dort jetzt bringen, ❌ heißt streichen. Rot: schon gestrichen.",
  },
  {
    part: "enter",
    place: "above",
    title: "Eintragen und Rückmeldung",
    text: "Tippe ein freies Feld und dann „eintragen“ – damit endet die Aufgabe. Du kannst auch eintragen, ohne alle Würfe zu nutzen. Nach jedem Wurf siehst du, ob dein Zug der beste war.",
  },
];

/**
 * A miniature of the quiz screen with a step-by-step tour: each step rings
 * one part, dims the rest and explains it in a bubble laid over the miniature,
 * so stepping through never moves anything on the page. Tapping a part jumps
 * to its step; the last step starts the quiz.
 */
type ScreenTourProps = {
  /** False while the solver table is still loading. */
  ready: boolean;
  /** The last step's button: starts the quiz, or leads back to it. */
  startLabel: string;
  onStart: () => void;
};

export function ScreenTour({ ready, startLabel, onStart }: ScreenTourProps) {
  const [step, setStep] = useState(0);
  const { part: active, place, title, text } = STEPS[step];
  const last = step === STEPS.length - 1;

  const bubble = (
    <div
      role="dialog"
      aria-label={title}
      // Its buttons must not also trigger the part's "jump to step".
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "absolute inset-x-0 z-20 flex cursor-default flex-col gap-1 rounded-xl bg-primary p-3 text-primary-foreground shadow-lg",
        place === "below" ? "top-full mt-3" : "bottom-full mb-3",
      )}
    >
      {/* The arrow pointing at the part. */}
      <span
        className={cn(
          "absolute left-8 size-3 rotate-45 bg-primary",
          place === "below" ? "-top-1.5" : "-bottom-1.5",
        )}
      />
      <p className="text-xs font-semibold opacity-70">
        Schritt {step + 1} von {STEPS.length}
      </p>
      <p className="font-bold">{title}</p>
      <p className="text-sm opacity-90">{text}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          <ChevronLeft />
          Zurück
        </Button>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.part}
              type="button"
              aria-label={`Schritt ${i + 1}: ${s.title}`}
              onClick={() => setStep(i)}
              className={cn(
                "size-2 rounded-full",
                i === step ? "bg-primary-foreground" : "bg-primary-foreground/30",
              )}
            />
          ))}
        </div>
        {last ? (
          <Button
            size="sm"
            className="bg-brand-accent text-white hover:bg-brand-accent/90"
            disabled={!ready}
            onClick={onStart}
          >
            {ready ? startLabel : "Lädt…"}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setStep(step + 1)}>
            Weiter
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );

  /** One part of the miniature; `anchor` marks where the part's bubble opens. */
  const part = (name: Part, children: ReactNode, anchor = true) => (
    <div
      onClick={() => setStep(STEPS.findIndex((s) => s.part === name))}
      className={cn(
        "relative cursor-pointer rounded-xl p-1.5 transition-all",
        active === name ? "z-10 ring-2 ring-brand-accent" : "opacity-35",
      )}
    >
      {children}
      {active === name && anchor && bubble}
    </div>
  );

  return (
    <Card className="flex flex-col gap-2 p-3">
      <p className="text-center font-bold">Aufgabe 1 von 3</p>
      {part("rolls", <p className="text-sm font-semibold">🎲 Noch 1 Wurf</p>)}
      {part(
        "enter",
        <p className="text-sm">
          💡 Besser wäre <b>5 5 5 halten</b> gewesen (−1,2 Punkte).
        </p>,
        false,
      )}
      {part(
        "dice",
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-5 gap-1.5">
            {[2, 5, 5, 3, 5].map((value, i) => (
              <Die key={i} value={value} held={value === 5} />
            ))}
          </div>
          <div className="flex h-8 items-center justify-center gap-1.5 rounded-md border text-sm font-medium">
            <Dices className="size-4" />
            Würfeln
          </div>
        </div>,
      )}
      {part(
        "card",
        <div className="flex flex-col gap-1.5">
          <div className={cn(pill, filledPill, "text-sm")}>
            <span>18</span>
            <span className="text-xs text-muted-foreground">Sechser</span>
          </div>
          <div className={cn(pill, openPill, "text-sm")}>
            <span className="text-muted-foreground">Fünfer</span>
            <span className="font-bold text-brand-accent">+15</span>
          </div>
          <div className={cn(pill, openPill, "text-sm")}>
            <span className="text-muted-foreground">Große Straße</span>
            <span className="font-bold">❌</span>
          </div>
          <div className={cn(pill, crossedPill, "text-sm")}>
            <span>❌</span>
            <span className="text-xs text-muted-foreground">Wunder</span>
          </div>
        </div>,
      )}
      {part(
        "enter",
        <div className="flex h-8 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground">
          Fünfer eintragen
        </div>,
      )}
    </Card>
  );
}
