"use client";

import type { ReactNode } from "react";

import { formatDuration } from "@/lib/utils";
import { MatchPlayer, StoredMatch } from "../types";

export const MEDALS = ["🥇", "🥈", "🥉"];

/** One number in the grid at the top of the statistics card. */
export type StatTile = {
  label: string;
  value: ReactNode;
  accent?: boolean;
};

/** One medal list, e.g. "Siegquote" or Flip 7's "Verzock-Quote". */
export type StatSection = {
  label: string;
  /** Optional explainer rendered next to the label — Yatzy explains its ranking. */
  info?: ReactNode;
  entries: Array<{ name: string; detail: ReactNode }>;
};

/**
 * What a game contributes to its own statistics card on top of the numbers
 * every game has (games played, highscore, average duration).
 */
export type GameStats = {
  tiles?: StatTile[];
  sections?: StatSection[];
};

type GamemodeStatsProps<TMatch extends StoredMatch<MatchPlayer>> = {
  /** Already narrowed to the selected gamemode. */
  matches: TMatch[];
  buildStats?: (matches: TMatch[]) => GameStats;
};

export function GamemodeStats<TMatch extends StoredMatch<MatchPlayer>>({
  matches,
  buildStats,
}: GamemodeStatsProps<TMatch>) {
  const gamesPlayed = matches.length;

  let highscore: { name: string; score: number } | null = null;
  for (const match of matches) {
    for (const player of match.players) {
      if (!highscore || player.score > highscore.score) {
        highscore = { name: player.name, score: player.score };
      }
    }
  }

  const durations = matches
    .map((match) => match.durationMs)
    .filter((duration): duration is number => typeof duration === "number");
  const averageDurationMs =
    durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : null;

  const { tiles = [], sections = [] } = buildStats?.(matches) ?? {};

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Statistiken
      </h2>
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-4">
        {gamesPlayed === 0 || !highscore ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Spiele in diesem Modus.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Tile label="Gespielte Spiele" value={gamesPlayed} />
              <Tile
                label="Highscore"
                value={`${highscore.score} · ${highscore.name}`}
                accent
              />
              {tiles.map((tile) => (
                <Tile key={tile.label} {...tile} />
              ))}
              {averageDurationMs !== null && (
                <Tile
                  label="Ø Spielzeit"
                  value={formatDuration(averageDurationMs)}
                />
              )}
            </div>

            {sections.map(
              (section) =>
                section.entries.length > 0 && (
                  <div
                    key={section.label}
                    className="flex flex-col gap-2 border-t border-border pt-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {section.label}
                      </p>
                      {section.info}
                    </div>
                    {section.entries.map(({ name, detail }, index) => (
                      <div
                        key={name}
                        className="flex items-center justify-between"
                      >
                        <span className="font-bold">
                          {MEDALS[index]} {name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {detail}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: StatTile) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-xl font-bold${accent ? " text-brand-accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}
