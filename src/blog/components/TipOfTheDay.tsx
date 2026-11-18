"use client";

import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { dateKey } from "@/games/quiz/puzzles";
import { chapterHref } from "../kniffel-strategie/chapters";
import { type DailyTip, tipForDate } from "../tips";

/**
 * The home page's tip from the Kniffel guide. Picked after mount from the
 * local date, so a page built yesterday never shows yesterday's tip.
 */
export function TipOfTheDay() {
  const [tip, setTip] = useState<DailyTip | null>(null);
  useEffect(() => setTip(tipForDate(dateKey())), []);

  return (
    <section className="wk-section min-h-[88px]" aria-label="Tipp des Tages">
      {tip && (
        <div className="wkx-tip">
          <Lightbulb className="size-5" aria-hidden="true" />
          <div className="wkx-tip-body">
            <p>{tip.text}</p>
            <Link href={chapterHref(tip.chapter)}>Warum? Im Guide lesen</Link>
          </div>
        </div>
      )}
    </section>
  );
}
