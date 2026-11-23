"use client";

import { Camera, Check, Plus, Printer, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Emoji } from "@/components/emoji/Emoji";
import { createRosterPlayer, loadRoster, saveRoster } from "@/games/shared/roster";
import { EMOJI_OPTIONS, type RosterPlayer } from "@/games/shared/types";
import { savePlayers, yatzyStorage } from "@/games/yatzy/storage";
import { cardTarget, CARD_MM, findCorners, homography, toGray, warp, type Quad } from "../corners";
import { saveScanCheck } from "../handoff";
import { matchNames, normalizeName, seatRoster } from "../players";
import { ScanStage, stageMinMs } from "./ScanStage";
import { cellsToCheck, playersFromRead, toPoints, type ReadSheet, type SheetPlayer } from "../sheet";

const MESSAGES: Record<string, string> = {
  "not set up": "Das Auslesen ist noch nicht eingerichtet.",
  limit: "Für heute sind alle Scans aufgebraucht. Morgen geht es weiter.",
  busy: "Gerade ist viel los. Versuch es gleich nochmal.",
  "bad image": "Mit diesem Bild hat es nicht geklappt. Nimm bitte ein neues Foto auf.",
  "too big": "Das Bild ist zu groß.",
  unreadable: "Das Blatt war nicht lesbar. Fotografiere es gerade von oben, gut beleuchtet.",
  "not a sheet": "Auf dem Foto ist kein Würfelkarte-Block zu sehen.",
};

/** Long side of the photo sent to the reader: enough for handwriting, small to upload. */
const MAX_SIDE = 1600;

/** Long side of the copy the corner marks are searched in: plenty for 5 mm squares, quick to scan. */
const DETECT_SIDE = 480;
/** The straightened card sent to the reader, in px per mm (1050 × 1485). */
const CARD_PX_PER_MM = 10;

function canvasOf(source: CanvasImageSource, width: number, height: number, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** The corner marks in the photo, found by plain image processing (corners.ts), or null. */
function detect(photo: HTMLCanvasElement): Quad | null {
  const small = canvasOf(photo, photo.width, photo.height, DETECT_SIDE);
  const { data } = small.getContext("2d")!.getImageData(0, 0, small.width, small.height);
  const quad = findCorners(toGray(data, small.width, small.height), small.width, small.height);
  const k = photo.width / small.width;
  return quad && (quad.map((p) => ({ x: p.x * k, y: p.y * k })) as Quad);
}

/** The card alone, flat and upright: what the reader gets when the marks were found. */
function straighten(photo: HTMLCanvasElement, quad: Quad): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.round(CARD_MM.w * CARD_PX_PER_MM);
  out.height = Math.round(CARD_MM.h * CARD_PX_PER_MM);
  const src = photo.getContext("2d")!.getImageData(0, 0, photo.width, photo.height);
  const ctx = out.getContext("2d")!;
  const dst = ctx.createImageData(out.width, out.height);
  warp(src, homography(cardTarget(out.width, out.height), quad), dst, [255, 255, 255]);
  ctx.putImageData(dst, 0, 0);
  return out;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Who a column goes to: a roster player, a new one by name, or not decided yet. */
type Seat = { kind: "roster"; id: string } | { kind: "new"; name: string } | null;

type Phase = "start" | "reading" | "assign";

/**
 * /scan: a photo of the paper Kniffelblock in; out comes the same sheet as a
 * running game on the Würfelkarte, every column given to a player from the
 * roster, so totals, the scoreboard and the statistics work as for any game.
 */
export function ScanPage() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("start");
  const [players, setPlayers] = useState<SheetPlayer[]>([]);
  const [unclear, setUnclear] = useState<string[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<{ photo: HTMLCanvasElement; quad: Quad | null } | null>(null);

  async function read(file: File) {
    setError(null);
    setPhase("reading");
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const photo = canvasOf(bitmap, bitmap.width, bitmap.height, MAX_SIDE);
      bitmap.close();
      const quad = detect(photo);
      setStage({ photo, quad });
      const image = (quad ? straighten(photo, quad) : photo).toDataURL("image/jpeg", 0.85);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const [response] = await Promise.all([
        fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image }),
        }),
        // Let the straightening and at least one sweep play out, however quick the answer.
        reduced ? null : sleep(stageMinMs(quad !== null)),
      ]);
      const body = (await response.json().catch(() => ({}))) as { error?: string; sheet?: ReadSheet; left?: number };
      if (!response.ok || !body.sheet) throw new Error(MESSAGES[body.error ?? ""] ?? "Hat nicht geklappt.");
      const read = playersFromRead(body.sheet);
      if (read.length === 0) throw new Error("Auf dem Blatt stehen noch keine Punkte.");
      const list = loadRoster();
      const matched = matchNames(read.map((p) => p.name), list);
      setRoster(list);
      setPlayers(read);
      setUnclear(body.sheet.unclear ?? []);
      setSeats(read.map((p, i): Seat => (matched[i] ? { kind: "roster", id: matched[i] } : p.name ? { kind: "new", name: p.name } : null)));
      setLeft(body.left ?? null);
      setPhase("assign");
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Keine Verbindung.");
      setPhase("start");
    } finally {
      setStage(null);
    }
  }

  const nameOf = (seat: Seat) =>
    seat?.kind === "roster" ? (roster.find((r) => r.id === seat.id)?.name ?? "") : seat?.kind === "new" ? seat.name.trim() : "";
  const names = seats.map(nameOf);
  const problems = seats.map((seat, i) => {
    if (!seat) return "Wähle aus, wem diese Spalte gehört.";
    const name = names[i];
    if (!name) return "Gib einen Namen ein.";
    if (seat.kind === "new" && roster.some((r) => normalizeName(r.name) === normalizeName(name)))
      return `${name} gibt es schon, tippe oben auf den Namen.`;
    if (names.some((n, j) => j !== i && n && normalizeName(n) === normalizeName(name))) return "Jeder Spieler nur einmal.";
    return null;
  });
  const ready = phase === "assign" && problems.every((p) => p === null);

  // Taking over replaces the running sheet, so say so when it holds anything.
  const running = useMemo(() => {
    if (phase !== "assign") return null;
    const game = yatzyStorage.loadGame();
    const started = game?.players.some((p) => Object.values(p.points).some((v) => v !== 0));
    return started ? game : null;
  }, [phase]);

  function takeOver() {
    let next = [...roster];
    const used = new Set(next.map((r) => r.emoji));
    const seated = seats.map((seat, i) => {
      if (seat?.kind === "roster") return next.find((r) => r.id === seat.id)!;
      const emoji = EMOJI_OPTIONS.find((e) => !used.has(e)) ?? EMOJI_OPTIONS[i % EMOJI_OPTIONS.length];
      used.add(emoji);
      const created = createRosterPlayer(names[i], emoji, next);
      next = [...next, created];
      return created;
    });
    saveRoster(seatRoster(next, seated.map((p) => p.name)));
    savePlayers(seated.map(({ name, emoji }) => ({ name, emoji })));

    const id = crypto.randomUUID();
    yatzyStorage.saveGame({
      id,
      gamemode: "Wunder",
      players: seated.map((p, i) => ({ name: p.name, emoji: p.emoji, points: toPoints(players[i]) })),
      startedAt: null,
      finishedAt: null,
    });
    saveScanCheck({
      id,
      cells: Object.fromEntries(seated.map((p, i) => [p.name, cellsToCheck(players[i], unclear)])),
      // Nobody sees a total before the scoreboard counts them up.
      reveal: true,
    });
    router.push("/yatzy/wunder");
  }

  return (
    <div className="wk min-h-full bg-background">
      <PageHeader title="Papierblock" />
      <main className="wk-page max-w-md">
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void read(file);
          }}
        />

        {phase === "reading" && stage && (
          <section className="flex flex-col items-center gap-4">
            <ScanStage photo={stage.photo} quad={stage.quad} />
            <div className="text-center" aria-live="polite">
              <p className="m-0 text-base font-bold">Das Blatt wird gelesen …</p>
              <p className="wk-caption">
                {stage.quad ? "Ecken gefunden, Blatt gerade gerückt." : "Ecken nicht gefunden, das Foto wird so gelesen."}
              </p>
            </div>
          </section>
        )}

        {phase !== "assign" && !(phase === "reading" && stage) && (
          <>
            <section className="wk-card">
              <h2 className="wk-card-title">Auf Papier spielen, hier auswerten</h2>
              <p className="wk-hint">
                Spielt auf dem Würfelkarte-Block und fotografiert das Blatt am Ende von oben, alle vier schwarzen Ecken im
                Bild. Danach steht es als Spiel in der Würfelkarte, mit Summen, Bonus und Auswertung.
              </p>
              <button
                type="button"
                className="wk-btn wk-btn-brand wk-btn-lg wk-btn-block"
                disabled={phase === "reading"}
                onClick={() => input.current?.click()}
              >
                <Camera className="size-5" aria-hidden="true" />
                {phase === "reading" ? "Wird gelesen …" : "Blatt fotografieren"}
              </button>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
            </section>
            <a href="/kniffelblock.pdf" target="_blank" rel="noopener" className="wk-listrow">
              <Printer className="size-6 text-ink-muted" aria-hidden="true" />
              <div className="wk-listrow-body">
                <p className="wk-listrow-title">Block ausdrucken</p>
                <p className="wk-listrow-sub">PDF, 4 Blätter (A6) auf einer A4-Seite</p>
              </div>
            </a>
            <section className="wk-section">
              <h2 className="wk-overline">Beim Eintragen</h2>
              <ul className="wk-hint list-disc space-y-1 pl-5">
                <li>Eine Zahl pro Feld, dunkler Stift.</li>
                <li>Gestrichen: X ins Feld.</li>
                <li>Full House, Straßen, Kniffel: Zahl oder Haken.</li>
                <li>Summen sind freiwillig, die App rechnet selbst.</li>
              </ul>
            </section>
          </>
        )}

        {phase === "assign" && (
          <>
            <section className="wk-section">
              <h2 className="wk-overline">Wer ist wer?</h2>
              <p className="wk-hint">
                Die Namen sind mit deinen Spielern abgeglichen. So zählt das Spiel in ihrer Statistik. Wer
                gewonnen hat, zeigt danach die Auswertung.
                {left !== null && ` Heute noch ${left} Scans.`}
              </p>
            </section>

            {players.map((player, i) => (
              <ColumnCard
                key={player.column}
                player={player}
                seat={seats[i]}
                roster={roster}
                takenIds={seats.flatMap((s, j) => (j !== i && s?.kind === "roster" ? [s.id] : []))}
                problem={problems[i]}
                onSeat={(seat) => setSeats((all) => all.map((s, j) => (j === i ? seat : s)))}
              />
            ))}

            <div className="flex flex-col gap-2">
              {running && (
                <p className="wk-caption text-center">
                  Das laufende Spiel ({running.players.map((p) => p.name).join(", ")}) wird dabei ersetzt.
                </p>
              )}
              <button type="button" className="wk-btn wk-btn-primary wk-btn-lg wk-btn-block" disabled={!ready} onClick={takeOver}>
                <Check className="size-5" aria-hidden="true" />
                In die Würfelkarte übernehmen
              </button>
              <button type="button" className="wk-btn wk-btn-ghost wk-btn-block" onClick={() => input.current?.click()}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Neu fotografieren
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ColumnCard({
  player,
  seat,
  roster,
  takenIds,
  problem,
  onSeat,
}: {
  player: SheetPlayer;
  seat: Seat;
  roster: RosterPlayer[];
  takenIds: string[];
  problem: string | null;
  onSeat: (seat: Seat) => void;
}) {
  const [draft, setDraft] = useState(player.name);
  // The roster's active players first, as the lobby shows them.
  const ordered = [...roster].sort((a, b) => Number(b.active) - Number(a.active));
  return (
    <section className="wk-card gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 font-display text-base font-bold">Spalte {player.column}</h3>
        <p className="wk-caption truncate">
          {player.name ? `gelesen: „${player.name}“` : "kein Name auf dem Blatt"}
        </p>
      </div>
      <div className="wk-row">
        {ordered.map((r) => {
          const selected = seat?.kind === "roster" && seat.id === r.id;
          const taken = takenIds.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={selected}
              disabled={taken}
              onClick={() => onSeat(selected ? null : { kind: "roster", id: r.id })}
              className="wk-chip disabled:opacity-35"
            >
              <span className="wk-chip-emoji">
                <Emoji e={r.emoji} />
              </span>
              {r.name}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={seat?.kind === "new"}
          onClick={() => onSeat(seat?.kind === "new" ? null : { kind: "new", name: draft })}
          className="wk-chip"
        >
          <Plus className="size-4" aria-hidden="true" />
          Neu
        </button>
      </div>
      {seat?.kind === "new" && (
        <div className="wk-input">
          <input
            value={draft}
            placeholder="Name"
            maxLength={24}
            autoFocus={!draft}
            aria-label={`Name für Spalte ${player.column}`}
            onChange={(e) => {
              setDraft(e.target.value);
              onSeat({ kind: "new", name: e.target.value });
            }}
          />
        </div>
      )}
      {problem && <p className="wk-caption text-danger">{problem}</p>}
    </section>
  );
}
