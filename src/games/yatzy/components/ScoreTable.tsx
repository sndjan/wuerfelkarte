"use client";

import { Emoji, EmojiText } from "@/components/emoji/Emoji";
import JSConfetti from "js-confetti";
import { AlertTriangle, Check, Lock, RotateCcw, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

import ThemeManager from "@/components/common/seasonal/ThemeManager";
import { THEME_EMOJIS, type Theme } from "@/components/common/seasonal/useSeasonalTheme";
import { WunderBurst, wunderStyleFor, type WunderShout } from "@/components/common/seasonal/WunderBurst";
import { cn } from "@/lib/utils";
import { PACE_COLOR, PACE_WORD, bonusPace } from "../bonus";
import { missingEntries } from "../turns";
import { gamemodes, type PointField } from "../gamemodes";
import type { BattleFieldStatus } from "../gamemodes/battle";
import { pointOptions } from "../points";
import type { Player } from "../types";

type Value = number | "X";

export type ScoreTableProps = {
  players: Player[];
  gamemode: keyof typeof gamemodes;
  hideScores: boolean;
  /** The total per player (Battle counts doubled fields twice). */
  scoreOf: (player: Player) => number;
  doubledOf?: (playerId: number) => Set<string>;
  /** Fields to look at again, e.g. after a scan of the paper block: marked until entered. */
  flaggedOf?: (playerId: number) => Set<string>;
  battleStatus?: (playerId: number, key: string) => BattleFieldStatus;
  /** A number, "X" for crossed out, or 0 to empty the field again. */
  onEnter: (playerId: number, key: string, value: number | "X" | 0) => void;
  /** Wraps the player's head in their menu (rename, move, remove). */
  playerMenu: (player: Player, trigger: ReactNode) => ReactNode;
  theme: Theme;
  isThemeActive: boolean;
};

/** Short names where a long one would not fit a cell (design system: Kategorien). */
const SHORT: Record<string, string> = {
  "Kleine Straße": "Kl. Straße",
  "Große Straße": "Gr. Straße",
  "Riesige Straße": "Ries. Straße",
};
const short = (field: PointField) => SHORT[field.label] ?? field.label;

/** Base value of one Wunder per mode; any multiple (stacked Wunders) is celebrated. */
const WUNDER_BASE: Record<string, number> = { Wunder: 50, "Mini Wunder": 30, "Super Wunder": 100 };

const UPPER_FACE: Record<string, number> = { Einser: 1, Zweier: 2, Dreier: 3, Vierer: 4, Fünfer: 5, Sechser: 6 };

const isEmpty = (value: Value | undefined) => value === undefined || value === 0;

type Open = { playerId: number; key: string; rect: DOMRect };

/**
 * The Würfelkarte as one table for every player: categories down, players
 * across. Tapping a cell opens its values right beside it; tapping the same
 * cell again enters the usual value (three of a kind in the upper section,
 * the fixed value below). The bonus sits under the sixes, its bar coloured by
 * how the player is doing. Phones keep the category names in a column on the
 * left; wider screens (iPad) put them into the open fields instead.
 */
export function ScoreTable({
  players,
  gamemode,
  hideScores,
  scoreOf,
  doubledOf,
  flaggedOf,
  battleStatus,
  onEnter,
  playerMenu,
  theme,
  isThemeActive,
}: ScoreTableProps) {
  const config = gamemodes[gamemode];
  const [open, setOpen] = useState<Open | null>(null);
  const [shout, setShout] = useState<WunderShout | null>(null);
  const confetti = useRef<JSConfetti | null>(null);
  useEffect(() => {
    confetti.current = new JSConfetti();
  }, []);

  // Close on a tap elsewhere, on scroll or Escape: the panel is placed against the cell once.
  // Taps on cells are left to the cells, so tapping the open one again can enter its usual value.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-value-picker], .wkx-cell")) return;
      close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const filled = (p: Player) => config.fields.filter((f) => !isEmpty(p.points[f.key as keyof Player["points"]])).length;
  const counts = players.map(filled);
  const missing = missingEntries(counts);
  const skipped = players.filter((_, i) => missing[i] > 0);
  const minFilled = Math.min(...counts);
  const complete = players.length > 0 && minFilled >= config.fields.length;
  // Whose turn it is: the first in seating order with the fewest entries.
  const activeIndex = complete ? -1 : players.findIndex((p) => filled(p) === minFilled);
  const active = activeIndex >= 0 ? players[activeIndex] : null;
  const next = activeIndex >= 0 ? players[(activeIndex + 1) % players.length] : null;
  const round = Math.min(minFilled + 1, config.fields.length);

  const optionsFor = (field: PointField) => field.options ?? pointOptions[field.key as keyof typeof pointOptions] ?? [];
  const usualFor = (field: PointField): number | undefined => {
    const quick = config.quickFill?.[field.key];
    if (typeof quick === "number") return quick;
    if (UPPER_FACE[field.key]) return UPPER_FACE[field.key] * 3;
    const options = optionsFor(field);
    return options.length === 1 && typeof options[0] === "number" ? options[0] : undefined;
  };
  const maxPerFace = (() => {
    const first = config.fields.find((f) => UPPER_FACE[f.key]);
    return first ? optionsFor(first).length : 5;
  })();

  const enter = (player: Player, key: string, value: number | "X" | 0) => {
    setOpen(null);
    const base = WUNDER_BASE[key];
    const emojis = player.emoji ? [...THEME_EMOJIS[theme], player.emoji] : THEME_EMOJIS[theme];
    if (base && typeof value === "number" && value > 0 && value % base === 0) {
      setShout({ key: Date.now(), name: player.name, emoji: player.emoji, style: wunderStyleFor(theme, isThemeActive) });
    } else if (key === "Große Straße" && value === 40 && player.name === "Mama") {
      confetti.current?.addConfetti({ emojis });
    }
    onEnter(player.id, key, value);
  };

  const tapCell = (player: Player, field: PointField, target: HTMLElement) => {
    const value = player.points[field.key as keyof Player["points"]] as Value | undefined;
    if (open && open.playerId === player.id && open.key === field.key) {
      const usual = usualFor(field);
      if (isEmpty(value) && usual !== undefined) enter(player, field.key, usual);
      else setOpen(null);
      return;
    }
    setOpen({ playerId: player.id, key: field.key, rect: target.getBoundingClientRect() });
  };

  const bonusAfter = config.bonus?.fields[config.bonus.fields.length - 1];
  const gridStyle = { "--n": players.length } as React.CSSProperties;
  const cols = "grid grid-cols-[74px_repeat(var(--n),minmax(0,1fr))] gap-1 md:grid-cols-[repeat(var(--n),minmax(0,1fr))] md:gap-3";
  const row = cn(cols, "items-center");
  // Field rows share the card's free height, so the card fills the screen; 32px (36px on iPad) at the least.
  const fieldRow = cn(cols, "min-h-8 flex-1 items-stretch md:min-h-9");

  const cell = (player: Player, field: PointField) => {
    const value = player.points[field.key as keyof Player["points"]] as Value | undefined;
    const empty = isEmpty(value);
    const status = battleStatus?.(player.id, field.key) ?? "open";
    const isOpen = open?.playerId === player.id && open.key === field.key;
    const usual = isOpen && empty ? usualFor(field) : undefined;
    const doubled = doubledOf?.(player.id).has(field.key) ?? false;
    const flagged = flaggedOf?.(player.id).has(field.key) ?? false;
    return (
      <button
        key={player.id}
        type="button"
        aria-pressed={isOpen}
        aria-label={`${field.label}, ${player.name}: ${value === "X" ? "gestrichen" : empty ? "offen" : value}${status === "forced" ? ", Pflichtfeld" : status === "blocked" ? ", blockiert" : ""}${flagged ? ", bitte prüfen" : ""}`}
        onClick={(event) => tapCell(player, field, event.currentTarget)}
        className={cn(
          "wkx-cell relative h-full min-h-8 w-full md:min-h-9",
          value === "X" ? "is-crossed" : !empty && "is-filled text-base leading-6 md:text-lg",
          empty && "md:justify-between md:px-3",
          isOpen && "is-active",
          usual !== undefined && "is-suggest",
          empty && status === "blocked" && "opacity-50",
          empty && status === "forced" && "ring-2 ring-gold",
          flagged && "ring-2 ring-gold",
        )}
      >
        {empty && (
          <span className="wkx-cell-label hidden md:inline" aria-hidden="true">
            {short(field)}
          </span>
        )}
        <span className="wkx-cell-val" aria-hidden="true">
          {value === "X" ? <X className="size-4" /> : empty ? (usual ?? "") : value}
          {empty && status === "blocked" && <Lock className="size-3.5 text-ink-muted" />}
        </span>
        {flagged && (
          <span className="absolute -top-1.5 -right-1 flex size-[14px] items-center justify-center rounded-full bg-gold text-[10px] leading-none font-extrabold text-on-gold">
            ?
          </span>
        )}
        {doubled && (
          <span className="absolute -top-1.5 -right-1 rounded-full bg-brand-strong px-1 text-[10px] leading-[14px] font-extrabold text-on-brand">
            ×2
          </span>
        )}
      </button>
    );
  };

  const openPlayer = open ? players.find((p) => p.id === open.playerId) : undefined;
  const openField = open ? config.fields.find((f) => f.key === open.key) : undefined;

  return (
    <div className="relative isolate flex flex-1 flex-col gap-3">
      {/* Only the two small motifs: the large one would sit on the hint under the table. */}
      <ThemeManager theme={theme} isThemeActive={isThemeActive} compact />
      <WunderBurst
        shout={shout}
        onBurst={() => {
          const p = players.find((x) => x.name === shout?.name);
          confetti.current?.addConfetti({ emojis: p?.emoji ? [...THEME_EMOJIS[theme], p.emoji] : THEME_EMOJIS[theme] });
        }}
        onDone={() => setShout(null)}
      />

      <div className="wk-card flex-1 gap-1 p-2.5" style={gridStyle}>
        <div className={cn(row, "pb-1")}>
          <span className="wk-caption md:hidden">Runde {round}/{config.fields.length}</span>
          {players.map((player, index) => (
            <Fragment key={player.id}>
              {playerMenu(
                player,
                <button
                  type="button"
                  aria-pressed={index === activeIndex}
                  aria-label={`${player.name}${index === activeIndex ? ", ist dran" : ""}${missing[index] > 0 ? `, ${missing[index] === 1 ? "ein Eintrag fehlt" : `${missing[index]} Einträge fehlen`}` : ""}. Spieler bearbeiten`}
                  className={cn("wkx-headbtn relative w-full", missing[index] > 0 && "ring-2 ring-danger")}
                >
                  <Emoji e={player.emoji ?? "🙂"} label="" />
                  <span className="wkx-headbtn-name hidden md:inline">{player.name}</span>
                  {missing[index] > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1 rounded-full bg-danger px-1.5 text-[10px] leading-[16px] font-extrabold text-on-danger"
                      aria-hidden="true"
                    >
                      −{missing[index]}
                    </span>
                  )}
                  {index === activeIndex && players.length <= 4 && (
                    <span className="wk-badge wk-badge-brand hidden lg:inline-flex">Am Zug</span>
                  )}
                </button>,
              )}
            </Fragment>
          ))}
        </div>

        {config.fields.map((field) => (
          <Fragment key={field.key}>
            <div className={fieldRow}>
              <span className="self-center truncate text-[13px] leading-4 font-bold md:hidden">{short(field)}</span>
              {players.map((player) => cell(player, field))}
            </div>
            {config.bonus && field.key === bonusAfter && (
              <div className={cn(row, "my-1 border-y border-hairline py-2")}>
                <span className="text-[13px] leading-4 font-bold md:hidden">
                  Bonus <span className="text-xs font-normal text-ink-muted">/{config.bonus.minSum}</span>
                </span>
                {players.map((player) => {
                  const { sum, pace } = bonusPace(player.points, config.bonus!, maxPerFace, doubledOf?.(player.id));
                  const share = `${Math.min(100, Math.round((sum / config.bonus!.minSum) * 100))}%`;
                  const reached = pace === "reached";
                  return (
                    <div
                      key={player.id}
                      role="img"
                      aria-label={`Bonus ${player.name}: ${sum} von ${config.bonus!.minSum}, ${PACE_WORD[pace]}${reached ? `, +${config.bonus!.bonus}` : ""}`}
                      className="flex flex-col gap-1 px-0.5 md:h-7 md:flex-row md:items-center md:gap-2.5 md:px-3"
                    >
                      <span className="hidden text-[13px] font-bold text-ink-muted md:inline">Bonus</span>
                      <span
                        className={cn(
                          "wk-num h-5 text-center text-[15px] leading-5 font-extrabold md:order-3 md:h-auto md:text-base",
                          reached && "hidden md:inline",
                        )}
                      >
                        {sum}
                        <span className="hidden text-[13px] font-normal text-ink-muted md:inline">/{config.bonus!.minSum}</span>
                      </span>
                      {reached && (
                        <span className="inline-flex h-5 items-center gap-0.5 self-center rounded-full bg-brand-strong px-1.5 text-xs font-extrabold whitespace-nowrap text-on-brand md:order-4 md:h-[22px] md:px-2">
                          <Check className="size-3" strokeWidth={3} aria-hidden="true" />+{config.bonus!.bonus}
                        </span>
                      )}
                      <div className="wk-progress h-2 md:order-2 md:h-2.5 md:flex-1">
                        <i style={{ width: share, background: PACE_COLOR[pace] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Fragment>
        ))}

        <div className={cn(row, "pt-1")}>
          <span className="text-[13px] font-bold md:hidden">Summe</span>
          {players.map((player) => (
            <div key={player.id} className="flex items-baseline justify-center md:justify-between md:px-3">
              <span className="hidden text-sm font-bold md:inline">Summe</span>
              <span className="wk-num font-display text-[15px] leading-6 font-extrabold md:text-2xl md:leading-8">
                {hideScores ? "•••" : scoreOf(player)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {skipped.length > 0 ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-md border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-ink"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
          <p>
            <b>
              <EmojiText text={skipped.map((p) => `${p.emoji ? `${p.emoji} ` : ""}${p.name}`).join(", ")} />
            </b>{" "}
            {skipped.length === 1 ? "fehlt" : "fehlen"}{" "}
            {skipped.length === 1 && missing[players.indexOf(skipped[0])] > 1
              ? `${missing[players.indexOf(skipped[0])]} Einträge`
              : "ein Eintrag"}{" "}
            gegenüber den anderen. Übersprungen? Trag das fehlende Feld nach, oder setze ein zu viel
            eingetragenes zurück.
          </p>
        </div>
      ) : (
        active && (
          <p className="wk-hint flex items-center justify-center gap-1.5 text-center">
            {active.emoji && <Emoji key={active.id} e={active.emoji} label="" autoPlay />}
            <b className="text-ink">{active.name}</b> ist dran.{next && next !== active && ` Danach ${next.name}.`}
          </p>
        )
      )}

      {open && openPlayer && openField && (
        <ValuePicker
          open={open}
          player={openPlayer}
          field={openField}
          options={optionsFor(openField)}
          usual={usualFor(openField)}
          onPick={(value) => enter(openPlayer, openField.key, value)}
        />
      )}
    </div>
  );
}

const PANEL_W = 300;

/** The values of one cell, placed right next to it: below, or above when there is no room. */
function ValuePicker({
  open,
  player,
  field,
  options,
  usual,
  onPick,
}: {
  open: Open;
  player: Player;
  field: PointField;
  options: Array<number | string>;
  usual?: number;
  onPick: (value: number | "X" | 0) => void;
}) {
  const value = player.points[field.key as keyof Player["points"]] as Value | undefined;
  const empty = isEmpty(value);
  const columns = options.length > 5 ? 6 : Math.max(options.length, 3);
  const rows = Math.ceil(options.length / columns);
  const height = 58 + rows * 46 + 46;
  const { rect } = open;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(PANEL_W, vw - 16);
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 8), vw - width - 8);
  const below = rect.bottom + 8 + height <= vh || rect.top - 8 - height < 0;
  const marked = typeof value === "number" ? value : usual;

  return (
    <>
      <div
        data-value-picker
        role="dialog"
        aria-label={`${field.label} für ${player.name}`}
        className="wkx-pop fixed z-50"
        style={{ left, width, ...(below ? { top: rect.bottom + 8 } : { bottom: vh - rect.top + 8 }) }}
      >
        <div className="wkx-head">
          <h2 className="wk-overline truncate">
            {field.label} · {player.name}
          </h2>
          <span className="wk-caption shrink-0">
            {!empty ? "Wert ändern" : usual !== undefined ? `Nochmal tippen: ${usual}` : "Summe aller Würfel"}
          </span>
        </div>
        <div className="wkx-pop-keys" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {options.map((option) => (
            <button
              key={String(option)}
              type="button"
              className="wk-key"
              aria-pressed={option === marked}
              onClick={() => onPick(typeof option === "number" ? option : Number(option))}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="wk-btn wk-btn-outline wk-btn-sm flex-1"
            disabled={empty}
            onClick={() => onPick(0)}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Zurücksetzen
          </button>
          <button type="button" className="wk-btn wk-btn-outline wk-btn-sm flex-1" onClick={() => onPick("X")}>
            <X className="size-4 text-danger" aria-hidden="true" />
            Streichen
          </button>
        </div>
      </div>
    </>
  );
}
