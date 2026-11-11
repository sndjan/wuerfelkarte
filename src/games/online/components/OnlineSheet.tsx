"use client";

import { Fragment } from "react";

import { gamemodes } from "@/games/yatzy/gamemodes";
import { cn } from "@/lib/utils";
import { fieldStatus, seatScore, upperSum, type Entry, type OnlineState } from "../engine";

type OnlineSheetProps = {
  state: OnlineState;
  mySeat: number;
  /** What each field would get on this turn (own column, digital dice). */
  preview: Record<string, Entry | null> | null;
  /** Fields the own column may take this turn (real dice). */
  tappable: Set<string>;
  selected: string | null;
  /** Cells the host may correct (real dice). */
  correctable: boolean;
  onCell: (seat: number, field: string) => void;
};

const cellText = (value: number | "X" | undefined) => (value === undefined ? "" : value === "X" ? "❌" : String(value));

/** Every player's column side by side, as on the paper sheet. */
export function OnlineSheet({ state, mySeat, preview, tappable, selected, correctable, onCell }: OnlineSheetProps) {
  const config = gamemodes[state.gamemode];
  const lastBonusField = config.bonus?.fields.at(-1);
  const finished = state.finishedAt !== null;

  return (
    <div className="overflow-x-auto rounded-[20px] bg-card p-2">
      <table className="w-full border-separate border-spacing-x-1 border-spacing-y-1 text-sm">
        <thead>
          <tr>
            <th className="w-[1%]" />
            {state.seats.map((seat, i) => (
              <th
                key={seat.userId}
                className={cn(
                  "max-w-0 truncate rounded-full px-1 py-1 text-center font-bold",
                  !finished && i === state.current && "bg-brand-accent text-white",
                  seat.left && "text-muted-foreground line-through",
                )}
                title={seat.name}
              >
                {i === mySeat ? "Du" : seat.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {config.fields.map(({ key, label }) => (
            <Fragment key={key}>
              <tr>
                <th className="whitespace-nowrap pr-1 text-left font-medium text-muted-foreground">{label}</th>
                {state.seats.map((seat, i) => {
                  const value = seat.points[key];
                  const status = fieldStatus(state, i, key);
                  const own = i === mySeat;
                  const entry = own ? preview?.[key] : undefined;
                  const canTap =
                    (own && (entry != null || tappable.has(key))) || (correctable && value !== undefined);
                  const doubled = seat.doubled.includes(key);
                  return (
                    <td key={seat.userId} className="p-0">
                      <button
                        type="button"
                        disabled={!canTap}
                        onClick={() => onCell(i, key)}
                        className={cn(
                          "relative flex h-8 w-full min-w-10 items-center justify-center rounded-full border border-input tabular-nums transition-colors disabled:cursor-default",
                          value === "X"
                            ? "bg-red-100 dark:bg-[#950606]"
                            : value !== undefined
                              ? "bg-gray-100 dark:bg-[#2f2f2f]"
                              : status === "blocked"
                                ? "bg-gray-200 opacity-60 dark:bg-[#1a1a1a]"
                                : status === "forced"
                                  ? "bg-amber-100 ring-2 ring-amber-400 dark:bg-amber-950/40 dark:ring-amber-500"
                                  : "bg-white dark:bg-[#212121]",
                          canTap && value === undefined && "hover:bg-brand-accent/10",
                          selected === key && own && "ring-2 ring-brand-accent",
                          seat.left && value === undefined && "opacity-40",
                        )}
                      >
                        {value !== undefined ? (
                          <>
                            {cellText(value)}
                            {doubled && (
                              <span className="absolute -right-1 -top-1 rounded-full bg-green-700 px-1 text-[10px] font-bold text-white">
                                ×2
                              </span>
                            )}
                          </>
                        ) : entry ? (
                          <span
                            className={cn(
                              "font-bold",
                              entry.value === "X" ? "text-xs opacity-40 grayscale" : "text-brand-accent",
                            )}
                          >
                            {entry.value === "X" ? "❌" : `+${entry.doubled ? entry.value * 2 : entry.value}`}
                          </span>
                        ) : status === "blocked" ? (
                          <span className="text-xs">🔒</span>
                        ) : status === "forced" ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Pflicht</span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
              {key === lastBonusField && (
                <tr>
                  <th className="pr-1 text-left text-xs font-medium text-muted-foreground">Bonus</th>
                  {state.seats.map((seat) => {
                    const upper = upperSum(state, seat)!;
                    const reached = upper.sum >= upper.min;
                    return (
                      <td key={seat.userId} className="text-center text-xs tabular-nums">
                        {reached ? (
                          <span className="rounded-full bg-green-800 px-1.5 py-0.5 font-bold text-white">
                            +{upper.bonus}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {upper.sum}/{upper.min}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )}
            </Fragment>
          ))}
          <tr>
            <th className="pr-1 pt-1 text-left font-bold">Summe</th>
            {state.seats.map((seat) => (
              <td key={seat.userId} className="pt-1 text-center text-base font-extrabold tabular-nums">
                {seatScore(state, seat)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
