"use client";

import { RotateCcw, Share2, Star } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { categoryLabel } from "@/games/quiz/feedback";
import { formatDate } from "@/games/quiz/config";
import { biggestMistakes, trainingStats } from "@/games/training/game";
import { StepRow } from "@/games/training/components/MoveFeedback";
import {
  CATEGORY_LABELS,
  SPEEDRUN_EMOJI,
  SPEEDRUN_NAME,
  STRAFE_MS_PER_POINT,
  formatDelta,
  formatSeconds,
  formatTime,
} from "../config";
import { goldSegments, personalBest, segment } from "../records";
import { buildMatch } from "../run";
import type { SpeedrunGame, StoredSpeedrunMatch } from "../types";
import { SpeedrunDistribution } from "./SpeedrunDistribution";

export function shareText(match: StoredSpeedrunMatch): string {
  const title = `${SPEEDRUN_EMOJI} ${SPEEDRUN_NAME} · ${CATEGORY_LABELS[match.category]}${
    match.date ? ` ${formatDate(match.date)}` : ""
  }`;
  const result =
    match.category === "any"
      ? `${formatTime(match.wertungMs)}`
      : `${formatTime(match.wertungMs)} (${formatTime(match.timeMs)} + ${formatSeconds(match.strafeMs)} Strafe)`;
  return [title, result, "würfelkarte.com/speedrun"].join("\n");
}

async function share(text: string) {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Ergebnis kopiert");
  } catch (error) {
    if ((error as Error)?.name !== "AbortError") toast.error("Teilen hat nicht geklappt");
  }
}

function Tile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-primary-foreground/10 px-2 py-2.5">
      <span className="text-xs text-primary-foreground/70">{label}</span>
      <span className={cn("text-xl font-bold tabular-nums", className)} style={{ fontFamily: "var(--font-baloo)" }}>
        {value}
      </span>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-muted px-3 py-2">
      <span className={cn("text-2xl font-extrabold tabular-nums", className)} style={{ fontFamily: "var(--font-baloo)" }}>
        {value}
      </span>
      <span className="text-xs leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

type FinishPanelProps = {
  game: SpeedrunGame;
  matches: StoredSpeedrunMatch[];
  onAgain: () => void;
  onLeave: () => void;
};

/** The finish line: Wertungszeit, splits, and what the solver thought of the run. */
export function FinishPanel({ game, matches, onAgain, onLeave }: FinishPanelProps) {
  const match = useMemo(() => buildMatch(game), [game]);
  const oldPb = personalBest(matches, game.category, game.id);
  const gold = goldSegments(matches, game.category, game.id);
  const newPb = !oldPb || match.wertungMs < oldPb.wertungMs;
  const stats = trainingStats(game);
  const mistakes = biggestMistakes(game, 3);
  const counted = game.category !== "any";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Enter" || event.repeat) return;
      if ((event.target as HTMLElement | null)?.closest("button, a, input, textarea, [role=dialog]")) return;
      event.preventDefault();
      onAgain();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAgain]);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <section className="flex flex-col items-center gap-1.5 rounded-b-[28px] bg-primary px-4 pt-2 pb-7 text-primary-foreground">
        <span className="text-sm text-primary-foreground/70">
          {CATEGORY_LABELS[game.category]}
          {game.date && ` · ${formatDate(game.date)}`}
          {game.category === "daily" && !game.ranked && " · Übung"}
        </span>
        {newPb && (
          <span className="mt-2 rounded-full bg-gold px-3 py-1 text-xs font-extrabold tracking-wide text-black uppercase">
            {oldPb ? "Neue Bestzeit" : "Erste Bestzeit"}
          </span>
        )}
        <span
          className="text-7xl leading-tight font-extrabold tabular-nums"
          style={{ fontFamily: "var(--font-baloo)" }}
        >
          {formatTime(match.wertungMs)}
        </span>
        {oldPb && (
          <span
            className={cn(
              "rounded-full px-3 py-0.5 text-lg font-bold tabular-nums text-white",
              match.wertungMs < oldPb.wertungMs ? "bg-brand-accent" : "bg-orange-500",
            )}
            style={{ fontFamily: "var(--font-baloo)" }}
          >
            {formatDelta(match.wertungMs - oldPb.wertungMs)} zur {newPb ? "alten " : ""}Bestzeit
          </span>
        )}
        <div className="mt-3 grid w-full max-w-md grid-cols-3 gap-2">
          <Tile label="Zeit" value={formatTime(match.timeMs)} />
          <Tile
            label={counted ? "Strafe" : "Strafe · zählt nicht"}
            value={`+${formatSeconds(counted ? match.strafeMs : stats.loss * STRAFE_MS_PER_POINT)}`}
            className="text-orange-300 dark:text-orange-700"
          />
          <Tile
            label={counted ? "Karte · zählt nicht" : "Karte"}
            value={`${match.score} P.`}
            className={counted ? "text-primary-foreground/70" : undefined}
          />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 lg:max-w-5xl lg:px-8">
        <div className="flex flex-col gap-4 lg:mx-auto lg:w-full lg:max-w-md">
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-12 rounded-full bg-brand-accent text-lg text-white hover:bg-brand-accent/90" onClick={onAgain}>
              <RotateCcw className="size-5" />
              Nochmal
            </Button>
            <Button variant="outline" className="h-12 rounded-full text-lg" onClick={() => share(shareText(match))}>
              <Share2 className="size-5" />
              Teilen
            </Button>
          </div>
          <Button variant="ghost" className="-mt-2 self-center text-muted-foreground" onClick={onLeave}>
            Andere Kategorie
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex items-baseline px-4 pt-4 pb-2">
              <h2 className="flex-1 text-lg font-bold">Splits</h2>
              <span className="text-xs text-muted-foreground">
                {counted ? "inkl. Strafe · " : ""}Δ zur {oldPb ? "Bestzeit" : "Zeit"}
              </span>
            </div>
            {match.splits.map((split, i) => {
              const turn = game.turns[i];
              const isGold = gold[i] !== null && segment(match.splits, i) < gold[i]!;
              const delta = oldPb ? split - oldPb.splits[i] : null;
              return (
                <div key={i} className="flex h-9 items-center gap-2.5 border-t border-hairline px-4 tabular-nums">
                  <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate text-[15px] font-semibold">
                    {categoryLabel(turn.category)}
                    {turn.points === 0 && <span className="text-muted-foreground"> ✕</span>}
                  </span>
                  <span className="flex w-5 justify-center">
                    {isGold && <Star className="size-4 fill-gold text-yellow-600" aria-label="Goldsplit" />}
                  </span>
                  <span className="w-14 text-right text-[15px] font-bold">{formatTime(split)}</span>
                  <span
                    className={cn(
                      "w-12 text-right text-sm font-extrabold",
                      delta === null ? "text-muted-foreground" : delta < 0 ? "text-brand-accent" : "text-orange-600",
                    )}
                  >
                    {delta === null ? "" : formatDelta(delta)}
                  </span>
                </div>
              );
            })}
          </Card>

          <div className="flex flex-col gap-4">
            {game.category === "daily" && game.date && game.ranked && (
              <SpeedrunDistribution date={game.date} wertungMs={match.wertungMs} />
            )}
            <Card className="gap-3 p-4">
              <div className="flex items-baseline">
                <h2 className="flex-1 text-lg font-bold">Analyse</h2>
                <span className="text-xs text-muted-foreground">vom Solver</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Ø Zugqualität" value={`${stats.rating}`} className="text-brand-accent" />
                <Stat label="beste Züge" value={`${stats.optimal}/${stats.decisions}`} />
                <Stat
                  label={counted ? "Punkte verschenkt = Strafe" : "Punkte verschenkt"}
                  value={formatSeconds(stats.loss * 1000)}
                  className="text-orange-600"
                />
              </div>
              <h3 className="mt-1 font-bold">Größte Fehler</h3>
              {mistakes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Kein einziger Fehler – jeder Zug war optimal. 🏆</p>
              ) : (
                <ol className="flex flex-col gap-4">
                  {mistakes.map(({ step, turn }, i) => (
                    <li key={i} className="flex flex-col gap-1">
                      <span className="flex text-xs font-semibold text-muted-foreground">
                        Zug {turn}
                        {counted && (
                          <span className="ml-auto font-extrabold text-orange-600 tabular-nums">
                            +{formatSeconds(step.loss * STRAFE_MS_PER_POINT)} s
                          </span>
                        )}
                      </span>
                      <StepRow step={step} />
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-xs text-muted-foreground">
                Gewertet wird jede Entscheidung, nicht der Wurf: jeder verschenkte erwartete Punkt kostet eine
                Sekunde. Ein Kniffel aus Glück macht den Lauf nicht besser, eine verpasste Straße nach richtigem
                Halten nicht schlechter.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
